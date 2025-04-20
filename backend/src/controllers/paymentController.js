const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');
const logger = require('../utils/logger');

// Create a payment intent for a booking
const createPaymentSession = async (req, res) => {
    try {
        const { amount, carId, startDate, endDate } = req.body;
        const userId = req.user.id;

        // Get car details from database
        const [car] = await pool.query(
            'SELECT make, model, price_per_hour FROM cars WHERE id = ?',
            [carId]
        );

        if (!car.length) {
            return res.status(404).json({ message: 'Car not found' });
        }

        const carDetails = car[0];

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to pence
            currency: 'gbp',
            metadata: {
                userId: userId.toString(),
                carId: carId.toString(),
                carMake: carDetails.make,
                carModel: carDetails.model,
                startDate: startDate,
                endDate: endDate
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        logger.error('Error creating payment intent:', error);
        res.status(500).json({ message: 'Error creating payment intent' });
    }
};

// Handle Stripe webhook events
const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        // Handle successful payment
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const bookingId = paymentIntent.metadata.bookingId;

            // Update booking status to confirmed
            await pool.query(
                'UPDATE bookings SET status = ?, payment_status = ? WHERE id = ?',
                ['confirmed', 'paid', bookingId]
            );

            // Get booking details for email notification
            const [bookingDetails] = await pool.query(
                `SELECT b.*, u.email, u.first_name, c.make, c.model, c.address 
                 FROM bookings b 
                 JOIN users u ON b.user_id = u.id 
                 JOIN cars c ON b.car_id = c.id 
                 WHERE b.id = ?`,
                [bookingId]
            );

            if (bookingDetails.length > 0) {
                // Send confirmation email (implement email service as needed)
                // await emailService.sendPaymentConfirmation(bookingDetails[0]);
            }
        }

        res.json({ received: true });
    } catch (error) {
        logger.error('Webhook error:', error);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }
};

// Handle payment cancellation
const handlePaymentCancelled = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user.id;

        // Verify booking belongs to user
        const [booking] = await pool.query(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [bookingId, userId]
        );

        if (!booking.length) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Update booking status to cancelled
        await pool.query(
            'UPDATE bookings SET status = ?, payment_status = ? WHERE id = ?',
            ['cancelled', 'cancelled', bookingId]
        );

        // If there's a payment session, cancel it
        if (booking[0].payment_session_id) {
            try {
                await stripe.checkout.sessions.expire(booking[0].payment_session_id);
            } catch (stripeError) {
                logger.error('Error expiring Stripe session:', stripeError);
                // Continue with cancellation even if Stripe session expiration fails
            }
        }

        res.json({ message: 'Payment cancelled successfully' });
    } catch (error) {
        logger.error('Error cancelling payment:', error);
        res.status(500).json({ message: 'Error cancelling payment' });
    }
};

module.exports = {
    createPaymentSession,
    handleWebhook,
    handlePaymentCancelled
}; 