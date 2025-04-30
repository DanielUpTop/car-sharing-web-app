const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');
const logger = require('../utils/logger');
const Membership = require('../models/membershipModel');
const MembershipUtils = require('../utils/membershipUtils');
const db = require('../config/dbConfig');

// Renamed function to match route usage
const createPaymentIntent = async (req, res) => {
    console.log('[PaymentController] Entered createPaymentIntent');
    // Get connection from pool
    let connection;
    try {
        // Import dbConfig for pool access within the function scope if needed
        const db = require('../config/dbConfig'); 
        connection = await db.getConnection();
        await connection.beginTransaction();

        const { amount, carId, startDate, endDate } = req.body;
        const userId = req.user.id;
        console.log(`[PaymentController] Data received: userId=${userId}, amount=${amount}, carId=${carId}, startDate=${startDate}, endDate=${endDate}`);

        if (!amount || !carId || !startDate || !endDate) {
            console.log('[PaymentController] Missing required fields');
            await connection.rollback();
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // --- Check Car Availability & Overlapping Bookings (crucial!) ---
        const [carCheck] = await connection.query('SELECT availability_status FROM cars WHERE id = ? FOR UPDATE', [carId]);
        if (!carCheck || carCheck.length === 0 || carCheck[0].availability_status !== 'available') {
             await connection.rollback();
             return res.status(409).json({ message: 'Car is not available for booking.' });
        }

        const [existingBookings] = await connection.query(
            `SELECT id FROM bookings
             WHERE car_id = ?
             AND status NOT IN ('cancelled', 'completed')
             AND ((start_date BETWEEN ? AND ?)
             OR (end_date BETWEEN ? AND ?)
             OR (start_date <= ? AND end_date >= ?))`,
            [carId, startDate, endDate, startDate, endDate, startDate, endDate]
        );

        if (existingBookings.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Car already booked for this period' });
        }
        // --- End Availability Checks ---

        const membership = await Membership.getUserMembership(userId);
        let finalAmount = amount;
        let discountPercentage = 0;
        let originalPrice = parseFloat(amount); // Assume amount passed is original

        if (membership) {
             // Calculate discount percentage based on type
             switch (membership.type) {
                case 'basic': discountPercentage = 5; break;
                case 'premium': discountPercentage = 10; break;
                case 'platinum': discountPercentage = 15; break;
                default: discountPercentage = 0;
            }
             if (discountPercentage > 0) {
                finalAmount = parseFloat((originalPrice * (1 - discountPercentage / 100)).toFixed(2));
                console.log(`Applied ${membership.type} discount. Original: ${originalPrice}, Discounted: ${finalAmount}`);
            } else {
                 finalAmount = originalPrice; // Ensure finalAmount is set even if discount is 0
            }
        } else {
            finalAmount = originalPrice; // Ensure finalAmount is set if no membership
        }

        // Convert amount to cents
        const amountInCents = Math.round(finalAmount * 100);

        // Validate dates
        if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
             console.log('[PaymentController] Invalid date format');
             await connection.rollback();
             return res.status(400).json({ message: 'Invalid date format' });
        }

        // 1. Create Booking Record
        console.log('[PaymentController] Inserting booking record...');
        const [bookingResult] = await connection.query(
            `INSERT INTO bookings (user_id, car_id, start_date, end_date, total_price, status, payment_status)
             VALUES (?, ?, ?, ?, ?, 'pending', 'pending')`,
            [userId, carId, startDate, endDate, finalAmount] // Use finalAmount for total_price
        );
        const bookingId = bookingResult.insertId;
        console.log(`[PaymentController] Booking record created with ID: ${bookingId}`);

        // 2. Update Car Status
        console.log(`[PaymentController] Updating car status for car ID: ${carId}`);
        await connection.query(
            'UPDATE cars SET availability_status = ? WHERE id = ?',
            ['booked', carId]
        );
        console.log(`[PaymentController] Car ${carId} status updated to booked.`);

        // 3. Create Stripe Payment Intent
        console.log('[PaymentController] Attempting to create Stripe Payment Intent...');
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'gbp',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                // Add bookingId to metadata
                booking_id: bookingId.toString(),
                user_id: userId.toString(),
                car_id: carId,
                start_date: startDate, // Store original format passed
                end_date: endDate,     // Store original format passed
                original_amount: originalPrice.toString(),
                discounted_amount: finalAmount.toString(),
                has_membership: membership ? 'true' : 'false',
                membership_type: membership ? membership.type : 'none'
            }
        });
        console.log('[PaymentController] Stripe Payment Intent created successfully:', paymentIntent.id);

        // 4. Update Booking with Payment Intent ID (Optional but good practice)
        await connection.query(
            'UPDATE bookings SET stripe_payment_intent_id = ? WHERE id = ?',
            [paymentIntent.id, bookingId]
        );

        // Commit Transaction
        await connection.commit();
        console.log('[PaymentController] Transaction committed.');

        console.log('[PaymentController] Sending clientSecret and bookingId back to frontend.');
        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            bookingId: bookingId, // Include bookingId in the response
            originalAmount: originalPrice,
            discountedAmount: finalAmount,
            hasMembership: !!membership,
            membershipType: membership ? membership.type : null
        });
        console.log('[PaymentController] Response sent.');

    } catch (error) {
        console.error('[PaymentController] Error caught in createPaymentIntent:', error);
        logger.error('Error creating payment intent:', error);
        // Rollback transaction on error
        if (connection) {
            await connection.rollback();
        }
        res.status(500).json({ error: 'Error creating payment intent' });
    } finally {
        // Release connection
        if (connection) {
            connection.release();
        }
    }
};

// Handle Stripe webhook events
const handleWebhook = async (req, res) => {
    console.log('[WEBHOOK] Received a request');
    logger.info('[WEBHOOK] Received a request');
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        console.log('[WEBHOOK] Attempting to construct event...');
        // --- TEMPORARY DEBUG LOG ---
        // Log the secret key being used for verification. REMOVE THIS IN PRODUCTION.
        // console.log('[WEBHOOK DEBUG] Using secret:', process.env.STRIPE_WEBHOOK_SECRET ? `"${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10)}..."` : 'Not found/undefined');
        // --- END TEMPORARY DEBUG LOG ---
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        logger.info(`Webhook received: ${event.type}`);
    } catch (err) {
        // Log the full error object for more details
        logger.error('Webhook signature verification failed. Full Error:', err);
        // Keep original message for response, but log the full error
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    let connection;
    try {
        // Get DB connection early for all event types that might need it
        connection = await db.getConnection();

        // Handle successful Checkout Session payment
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            logger.info('Webhook processing: checkout.session.completed', { sessionId: session.id, paymentStatus: session.payment_status });

            // Check if the payment was successful
            if (session.payment_status === 'paid') {
                const membershipType = session.metadata.membershipType;
                const tierId = session.metadata.tierId;
                const userId = parseInt(session.metadata.userId || session.client_reference_id, 10);
                const sessionId = session.id;

                if (!userId || !membershipType) {
                    logger.error('Webhook Error: Missing userId or membershipType in checkout session metadata.', { metadata: session.metadata, client_ref: session.client_reference_id });
                    // Acknowledge receipt but log error
                    return res.status(200).json({ received: true, error: 'Missing metadata' });
                }

                logger.info(`Webhook: Processing successful payment for user ${userId}, type ${membershipType}.`);

                await connection.beginTransaction();
                try {
                    // 1. Deactivate any existing active/pending memberships for the user
                    logger.info(`Webhook: Deactivating existing memberships for user ${userId}.`);
                    await connection.query(
                        'UPDATE memberships SET status = ?, end_date = NOW() WHERE user_id = ? AND status IN (?, ?)',
                        ['cancelled', userId, 'active', 'pending']
                    );
                    logger.info(`Webhook: Existing memberships deactivated for user ${userId}.`);

                    // 2. Create the new active membership record
                    const startDate = new Date();
                    const endDate = new Date(startDate);
                    endDate.setMonth(endDate.getMonth() + 1); // Simple monthly membership

                    logger.info(`Webhook: Inserting new membership: User=${userId}, Type=${membershipType}, Start=${startDate.toISOString()}, End=${endDate.toISOString()}, Session=${sessionId}`);
                    const [insertResult] = await connection.query(
                        `INSERT INTO memberships (user_id, type, status, start_date, end_date, auto_renew)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [userId, membershipType, 'active', startDate, endDate, true] // Default auto_renew to true
                    );
                    logger.info(`Webhook: New membership (ID: ${insertResult.insertId}) created for user ${userId}.`);

                    // Optional: Link to membership_tiers table if needed
                    // await connection.query('UPDATE memberships SET membership_tier_id = ? WHERE id = ?', [tierId, insertResult.insertId]);

                    await connection.commit();
                    logger.info(`Webhook: Transaction committed for user ${userId} membership update.`);

                } catch (dbError) {
                    logger.error(`Webhook DB Error during membership update for user ${userId}:`, dbError);
                    await connection.rollback();
                    logger.info(`Webhook: Transaction rolled back for user ${userId}.`);
                    // Indicate error to Stripe for potential retry?
                    // For now, return 500 to signal processing failure.
                    return res.status(500).json({ error: 'Database update failed during webhook processing.' });
                }
            } else {
                logger.warn(`Webhook: Received checkout.session.completed for session ${session.id} but payment status was ${session.payment_status}. No action taken.`);
            }
        }
        // Handle successful Payment Intent (existing logic for direct payments/bookings)
        else if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            logger.info('Webhook processing: payment_intent.succeeded', { paymentIntentId: paymentIntent.id });

            const bookingId = paymentIntent.metadata.booking_id;
            if (!bookingId) {
                logger.error('Webhook Error: Missing booking_id in payment intent metadata.', { paymentIntentId: paymentIntent.id });
                return res.status(200).json({ received: true, error: 'Missing booking_id' });
            }

            // Use the existing connection
            await connection.beginTransaction();
            try {
                logger.info(`Webhook: Updating booking ${bookingId} payment status to 'paid'.`);
                const [updateResult] = await connection.query(
                    `UPDATE bookings 
                     SET payment_status = ?, stripe_payment_intent_id = ? 
                     WHERE id = ? AND status = ? AND payment_status != ?`,
                    ['paid', paymentIntent.id, bookingId, 'pending', 'paid']
                );

                if (updateResult.affectedRows === 0) {
                    logger.warn(`Webhook: Booking ${bookingId} not found, not in 'pending' state, or already marked as 'paid'. No update performed.`);
                } else {
                    logger.info(`Webhook: Booking ${bookingId} payment status successfully updated to 'paid'.`);
                }
                await connection.commit();
                logger.info(`Webhook: Transaction committed for booking ${bookingId} payment status update.`);
            } catch (dbError) {
                logger.error(`Webhook DB Error during booking update for paymentIntent ${paymentIntent.id}:`, dbError);
                await connection.rollback();
                logger.info(`Webhook: Transaction rolled back for booking ${bookingId} payment status update.`);
                // Return 500 to signal processing failure to Stripe
                return res.status(500).json({ error: 'Database update failed during webhook processing.' });
            }
        }
        // Handle failed Payment Intent
        else if (event.type === 'payment_intent.payment_failed') {
             const paymentIntent = event.data.object;
             logger.warn('Webhook processing: payment_intent.payment_failed', { paymentIntentId: paymentIntent.id });
             const bookingId = paymentIntent.metadata.booking_id;

             if (!bookingId) {
                 logger.error('Webhook Error: Missing booking_id in failed payment intent metadata.', { paymentIntentId: paymentIntent.id });
                 return res.status(200).json({ received: true, error: 'Missing booking_id' });
             }

             // Use the existing connection
             await connection.beginTransaction();
             try {
                 logger.info(`Webhook: Updating booking ${bookingId} to 'failed' due to payment failure.`);
                 // Option 1: Update status to 'failed'
                 // const [updateResult] = await connection.query(
                 //     `UPDATE bookings SET status = ?, payment_status = ? WHERE id = ? AND status = ?`,
                 //     ['failed', 'failed', bookingId, 'pending']
                 // );

                 // Option 2: Keep status 'pending', update payment_status to 'failed'
                 // This might be better if you want admins to review before changing booking status
                 const [updateResult] = await connection.query(
                     `UPDATE bookings SET payment_status = ? WHERE id = ? AND status = ?`,
                     ['failed', bookingId, 'pending']
                 );


                 if (updateResult.affectedRows === 0) {
                     logger.warn(`Webhook: Booking ${bookingId} for failed payment not found or not in 'pending' state. No update performed.`);
                 } else {
                     logger.info(`Webhook: Booking ${bookingId} payment status updated to 'failed'.`);

                     // Also revert car availability
                     const [bookingDetails] = await connection.query('SELECT car_id FROM bookings WHERE id = ?', [bookingId]);
                     if (bookingDetails.length > 0) {
                         const carId = bookingDetails[0].car_id;
                         logger.info(`Webhook: Reverting car ${carId} status to 'available' due to failed payment for booking ${bookingId}.`);
                         await connection.query('UPDATE cars SET availability_status = ? WHERE id = ? AND availability_status = ?', ['available', carId, 'booked']);
                     } else {
                          logger.warn(`Webhook: Could not find car details for booking ${bookingId} to revert status.`);
                     }
                 }
                 await connection.commit();
                 logger.info(`Webhook: Transaction committed for failed payment update on booking ${bookingId}.`);
             } catch (dbError) {
                 logger.error(`Webhook DB Error during failed payment update for booking ${bookingId}:`, dbError);
                 await connection.rollback();
                 logger.info(`Webhook: Transaction rolled back for failed payment update on booking ${bookingId}.`);
                 return res.status(500).json({ error: 'Database update failed during webhook processing for failed payment.' });
             }
        }
        // Add other event types here if needed (e.g., invoice.payment_succeeded for subscriptions)
        else {
            logger.info(`Webhook received: Unhandled event type ${event.type}`);
        }

        // Acknowledge receipt for handled or unhandled events (unless an error was already sent)
        res.json({ received: true });

    } catch (error) {
        // Catch unexpected errors during event processing (outside DB transaction)
        logger.error('Webhook Error: Unexpected error in handler:', error);
        // Don't rollback here as the connection might not be in a transaction or might be released
        res.status(500).json({ error: 'Internal server error during webhook processing.' });
    } finally {
        if (connection) {
            connection.release();
            logger.info('Webhook: Database connection released.');
        }
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