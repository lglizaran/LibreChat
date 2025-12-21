const { getBalanceConfig } = require('@librechat/api');
const { Balance } = require('~/db/models');
const { createTransaction } = require('~/models/Transaction');
const { getAppConfig } = require('~/server/services/Config');

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

module.exports = {
  getBalance,
  addCredits,
};
