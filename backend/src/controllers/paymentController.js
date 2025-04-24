const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');
const logger = require('../utils/logger');

// Renamed function to match route usage
const createPaymentIntent = async (req, res) => {
    console.log('[PaymentController] Entered createPaymentIntent');
    try {
        const { amount, carId, startDate, endDate } = req.body;
        const userId = req.user.id;
        console.log(`[PaymentController] Data received: userId=${userId}, amount=${amount}, carId=${carId}, startDate=${startDate}, endDate=${endDate}`);

        if (!amount || !carId || !startDate || !endDate) {
            console.log('[PaymentController] Missing required fields');
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Format dates for Stripe metadata (ISO string format)
        const formattedStartDate = new Date(startDate).toISOString();
        const formattedEndDate = new Date(endDate).toISOString();
        console.log(`[PaymentController] Formatted dates: start=${formattedStartDate}, end=${formattedEndDate}`);

        // Validate dates
        if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
             console.log('[PaymentController] Invalid date format');
            return res.status(400).json({ message: 'Invalid date format' });
        }

        console.log('[PaymentController] Attempting to create Stripe Payment Intent...');
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to pence
            currency: 'gbp',
            payment_method_types: ['card'],
            metadata: {
                userId: userId.toString(),
                carId: carId.toString(),
                startDate: formattedStartDate,
                endDate: formattedEndDate
            }
        });
        console.log('[PaymentController] Stripe Payment Intent created successfully:', paymentIntent.id);

        console.log('[PaymentController] Sending clientSecret back to frontend.');
        res.json({
            clientSecret: paymentIntent.client_secret
        });
        console.log('[PaymentController] Response sent.');
    } catch (error) {
        console.error('[PaymentController] Error caught in createPaymentIntent:', error);
        logger.error('Error creating payment intent:', error);
        res.status(500).json({ message: 'Error creating payment intent', error: error.message || 'Unknown error' });
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
            const { userId, carId, startDate, endDate } = paymentIntent.metadata;
            const amount = paymentIntent.amount / 100; // Convert from pence to pounds

            // Parse dates back from ISO string
            const parsedStartDate = new Date(startDate);
            const parsedEndDate = new Date(endDate);

            // Create booking
            await pool.query(
                `INSERT INTO bookings (user_id, car_id, start_date, end_date, total_price, status, payment_intent_id)
                 VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`,
                [userId, carId, parsedStartDate, parsedEndDate, amount, paymentIntent.id]
            );

            // Update car availability
            await pool.query(
                'UPDATE cars SET availability_status = ? WHERE id = ?',
                ['booked', carId]
            );
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
    createPaymentIntent,
    handleWebhook,
    handlePaymentCancelled
}; 