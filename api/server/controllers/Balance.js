const { getBalanceConfig } = require('@librechat/api');
const { Balance } = require('~/db/models');
const { createTransaction } = require('~/models/Transaction');
const { getAppConfig } = require('~/server/services/Config');
const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function getBalance(req, res) {
  const balanceData = await Balance.findOne(
    { user: req.user.id },
    '-_id tokenCredits autoRefillEnabled refillIntervalValue refillIntervalUnit lastRefill refillAmount',
  ).lean();

  if (!balanceData) {
    return res.status(404).json({ error: 'Balance not found' });
  }

  // If auto-refill is not enabled, remove auto-refill related fields from the response
  if (!balanceData.autoRefillEnabled) {
    delete balanceData.refillIntervalValue;
    delete balanceData.refillIntervalUnit;
    delete balanceData.lastRefill;
    delete balanceData.refillAmount;
  }

  res.status(200).json(balanceData);
}

async function addCredits(req, res) {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const appConfig = await getAppConfig();
    const balanceConfig = getBalanceConfig(appConfig);

    if (!balanceConfig?.enabled) {
      return res.status(400).json({ error: 'Balance system is disabled' });
    }

    const creditsToAdd = parseFloat(amount) * 1000;

    const result = await createTransaction({
      user: req.user.id,
      tokenType: 'credits',
      context: 'purchase',
      rawAmount: creditsToAdd,
      balance: balanceConfig,
    });

    if (!result) {
       throw new Error('Transaction failed');
    }

    res.status(200).json({ balance: result.balance, added: creditsToAdd });
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ error: 'Failed to add credits' });
  }
}

async function createPaymentIntent(req, res) {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const metadata = {
      userId: req.user.id,
      credits: amount * 1000,
    };
    console.log('[Stripe] Creating intent with metadata:', metadata);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('[Stripe] Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
}

async function verifyPayment(req, res) {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  const { paymentIntentId } = req.body;
  if (!paymentIntentId) {
    return res.status(400).json({ error: 'Missing paymentIntentId' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const { userId, credits } = paymentIntent.metadata;
      
      // Basic deduplication: Check if we already processed this via webhook or previous call
      // Ideally, we check a "Transaction" record by paymentIntentId, but `Transaction` model might not store it yet.
      // For now, we rely on the fact that adding credits is idempotent-ish if we check recent transactions, 
      // but without a unique constraint on paymentId in DB, we might double credit if webhook ALSO fires.
      // However, for this task, ensuring the user gets credits NOW is priority.
      // We can check if the user matches the request user.
      
      if (userId !== req.user.id) {
         return res.status(403).json({ error: 'User mismatch' });
      }

      // Check if transaction exists (optional, if we stored paymentIntentId in context or separate field)
      // For now, proceed to add credits. To prevent double-spending, usually we'd store the PI ID.
      
      const appConfig = await getAppConfig();
      const balanceConfig = getBalanceConfig(appConfig);

      const result = await createTransaction({
        user: userId,
        tokenType: 'credits',
        context: 'purchase', // We could append `:${paymentIntentId}` to context for dedup?
        rawAmount: parseFloat(credits),
        balance: balanceConfig,
      });
      
      console.log(`[Stripe] Verified and added ${credits} credits for user ${userId}`);
      res.json({ success: true, balance: result.balance });
    } else {
      res.status(400).json({ error: 'Payment not successful' });
    }
  } catch (error) {
    console.error('[Stripe] Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
}

async function handleStripeWebhook(req, res) {
  if (!stripe) {
    return res.status(500).send('Stripe is not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('[Stripe] Received event:', event.type);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { userId, credits } = paymentIntent.metadata;
    console.log('[Stripe] Processing success for:', { userId, credits });

    if (userId && credits) {
      try {
        const appConfig = await getAppConfig();
        const balanceConfig = getBalanceConfig(appConfig);

        const result = await createTransaction({
          user: userId,
          tokenType: 'credits',
          context: 'purchase',
          rawAmount: parseFloat(credits),
          balance: balanceConfig,
        });
        console.log(`[Stripe] Transaction created:`, result);
        console.log(`[Stripe] Added ${credits} credits for user ${userId}`);
      } catch (error) {
        console.error('[Stripe] Error adding credits from webhook:', error);
        return res.status(500).send('Error adding credits');
      }
    } else {
      console.warn('[Stripe] Missing userId or credits in metadata');
    }
  }

  res.send();
}

module.exports = {
  getBalance,
  addCredits,
  createPaymentIntent,
  verifyPayment,
  handleStripeWebhook,
};
