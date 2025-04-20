const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/dbConfig');

// Create payment intent
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    try {
        const { amount, carId, startDate, endDate } = req.body;

        if (!amount || !carId || !startDate || !endDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to pence
            currency: 'gbp',
            metadata: {
                carId,
                userId: req.user.id,
                startDate,
                endDate
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ message: 'Error creating payment intent' });
    }
});

// Handle Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        // Create the booking here
        try {
            const { carId, userId, startDate, endDate } = paymentIntent.metadata;
            const amount = paymentIntent.amount / 100; // Convert from pence to pounds

            // Create booking
            const [result] = await db.query(
                `INSERT INTO bookings (user_id, car_id, start_date, end_date, total_price, status, payment_intent_id)
                 VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`,
                [userId, carId, startDate, endDate, amount, paymentIntent.id]
            );

            // Update car availability
            await db.query(
                'UPDATE cars SET availability_status = ? WHERE id = ?',
                ['booked', carId]
            );
        } catch (error) {
            console.error('Error creating booking:', error);
        }
    }

    res.json({ received: true });
});

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