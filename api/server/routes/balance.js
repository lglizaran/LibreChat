const express = require('express');
const router = express.Router();
const controller = require('../controllers/Balance');
const { requireJwtAuth } = require('../middleware/');

router.get('/', requireJwtAuth, controller.getBalance);
router.post('/credits', requireJwtAuth, controller.addCredits);
router.post('/payment-intent', requireJwtAuth, controller.createPaymentIntent);
router.post('/verify-payment', requireJwtAuth, controller.verifyPayment);
router.post('/webhook', controller.handleStripeWebhook);

module.exports = router;
