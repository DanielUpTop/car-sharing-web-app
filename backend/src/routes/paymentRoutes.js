const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/dbConfig');
const paymentController = require('../controllers/paymentController');

// Create payment intent
router.post('/create-payment-intent', authenticateToken, paymentController.createPaymentIntent); // Restore original with authenticateToken
// router.post('/create-payment-intent', paymentController.createPaymentIntent); // Temporarily remove authenticateToken for debugging

// Handle Stripe webhook - express.raw MUST be handled globally in app.js
// router.post(
//     '/webhook',
//     express.raw({type: 'application/json'}), // REMOVE raw parser from here
//     paymentController.handleWebhook
// );

// Get payment status
router.get('/status/:paymentIntentId', authenticateToken, async (req, res) => {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
            req.params.paymentIntentId
        );
        res.json({ status: paymentIntent.status });
    } catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({ message: 'Error getting payment status' });
    }
});

module.exports = router; 