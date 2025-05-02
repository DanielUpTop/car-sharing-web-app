const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/adminAuth');
const db = require('../config/dbConfig');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(isAdmin);

// Get all bookings with user and car details
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                b.id,
                b.user_id,
                b.car_id,
                b.start_date,
                b.end_date,
                b.status,
                b.total_price,
                b.created_at,
                b.priority,
                u.first_name,
                u.last_name,
                u.email,
                c.make,
                c.model,
                c.registration_number,
                c.address,
                c.location,
                c.latitude,
                c.longitude
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            ORDER BY 
                CASE 
                    WHEN b.priority = 2 THEN 1  -- VIP priority
                    WHEN b.priority = 1 THEN 2  -- Regular priority
                    ELSE 3                      -- No priority
                END,
                b.created_at DESC
        `;
        
        const [bookings] = await db.query(query);
        
        // Get all booking IDs to fetch discounts info
        const bookingIds = bookings.map(booking => booking.id);
        
        // Get membership discount information for all bookings in a single query
        const [discountInfo] = await db.query(`
            SELECT * FROM booking_discounts 
            WHERE booking_id IN (?)
        `, [bookingIds.length > 0 ? bookingIds : [0]]);
        
        // Create a map for quick lookup
        const discountMap = {};
        discountInfo.forEach(discount => {
            discountMap[discount.booking_id] = discount;
        });
        
        // Format the data to match the frontend expectations
        const formattedBookings = bookings.map(booking => {
            // Get membership discount info if available
            const discount = discountMap[booking.id];
            
            const formattedBooking = {
            id: booking.id,
            user_id: booking.user_id,
            car_id: booking.car_id,
            start_date: booking.start_date,
            end_date: booking.end_date,
            status: booking.status,
            total_price: booking.total_price,
            created_at: booking.created_at,
                priority: booking.priority || 0,
            user: {
                first_name: booking.first_name,
                last_name: booking.last_name,
                email: booking.email
            },
            car: {
                make: booking.make,
                model: booking.model,
                registration_number: booking.registration_number,
                address: booking.address || booking.location || `${booking.latitude}, ${booking.longitude}`
            }
            };
            
            // Add membership info if available
            if (discount) {
                formattedBooking.membership = {
                    type: discount.membership_type,
                    discount_percentage: discount.discount_percentage,
                    original_price: parseFloat(discount.original_price),
                    discounted_price: parseFloat(discount.discounted_price)
                };
            }
            
            return formattedBooking;
        });

        res.json(formattedBookings);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Get booking details by ID
router.get('/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // First get the basic booking information
        const [booking] = await db.query(`
            SELECT 
                b.*,
                u.first_name,
                u.last_name,
                u.email,
                c.make,
                c.model,
                c.registration_number,
                c.address,
                c.location,
                c.latitude,
                c.longitude
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            WHERE b.id = ?
        `, [id]);

        if (!booking.length) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Format the data to match the frontend expectations
        const formattedBooking = {
            ...booking[0],
            user: {
                first_name: booking[0].first_name,
                last_name: booking[0].last_name,
                email: booking[0].email
            },
            car: {
                make: booking[0].make,
                model: booking[0].model,
                registration_number: booking[0].registration_number,
                address: booking[0].address || booking[0].location || `${booking[0].latitude}, ${booking[0].longitude}`
            }
        };

        // Remove duplicate fields
        delete formattedBooking.first_name;
        delete formattedBooking.last_name;
        delete formattedBooking.email;
        delete formattedBooking.make;
        delete formattedBooking.model;
        delete formattedBooking.registration_number;
        delete formattedBooking.address;
        delete formattedBooking.location;
        delete formattedBooking.latitude;
        delete formattedBooking.longitude;

        // Check for membership and discount information
        try {
            // Check if there's discount information
            const [discountInfo] = await db.query(`
                SELECT * FROM booking_discounts 
                WHERE booking_id = ?
            `, [id]);

            // Check user's membership at the time of booking
            const [membershipInfo] = await db.query(`
                SELECT m.type 
                FROM memberships m 
                WHERE m.user_id = ? 
                AND m.status = 'active' 
                AND (m.start_date <= ? AND (m.end_date IS NULL OR m.end_date >= ?))
            `, [booking[0].user_id, booking[0].created_at, booking[0].created_at]);

            // Add membership information to the response
            if (discountInfo.length > 0) {
                formattedBooking.membership = {
                    type: discountInfo[0].membership_type,
                    discount_percentage: discountInfo[0].discount_percentage,
                    original_price: parseFloat(discountInfo[0].original_price),
                    discounted_price: parseFloat(discountInfo[0].discounted_price)
                };
            } else if (membershipInfo.length > 0) {
                formattedBooking.membership = {
                    type: membershipInfo[0].type,
                    discount_percentage: 0 // No discount was applied
                };
            }
        } catch (membershipError) {
            console.error('Error fetching membership information:', membershipError);
            // Continue without membership info if there's an error
        }

        res.json(formattedBooking);
    } catch (error) {
        console.error('Error fetching booking details:', error);
        res.status(500).json({ message: 'Error fetching booking details' });
    }
});

// Update booking status
router.put('/:id/status', async (req, res) => {
    const connection = await db.getConnection(); // Get a connection
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Start transaction
        await connection.beginTransaction();

        // Fetch the booking details, including user_id, current status, payment_status, and stripe_payment_intent_id
        const [booking] = await connection.query(
            'SELECT user_id, status, payment_status, stripe_payment_intent_id FROM bookings WHERE id = ?',
            [id]
        );

        if (booking.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Booking not found' });
        }

        const currentStatus = booking[0].status;
        const currentPaymentStatus = booking[0].payment_status; // Get current payment status
        const paymentIntentId = booking[0].stripe_payment_intent_id;
        const userId = booking[0].user_id;

        // Determine if a reward was applied based on the payment intent metadata (best effort)
        let rewardWasAppliedBasedOnMetadata = false;
        if (paymentIntentId) {
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                if (paymentIntent.metadata.reward_discount_applied && paymentIntent.metadata.reward_discount_applied !== 'none') {
                    rewardWasAppliedBasedOnMetadata = true;
                    console.log(`Admin Confirm: Metadata check - Reward (${paymentIntent.metadata.reward_discount_applied}) was applied to this booking via Payment Intent ${paymentIntentId}.`);
                }
            } catch (stripeError) {
                console.error(`Admin Confirm: Error retrieving Payment Intent ${paymentIntentId} from Stripe:`, stripeError);
                // If PI fetch fails, we rely solely on payment_status check below
            }
        }

        // Update booking status
        const updateQuery = 'UPDATE bookings SET status = ? WHERE id = ?';
        const [updateResult] = await connection.query(updateQuery, [status, id]);

        if (updateResult.affectedRows === 0) {
            // If no rows were updated (e.g., status was already the target status), roll back
            await connection.rollback();
            // Send a success message still, as the state is as requested, or handle as needed
            return res.json({ message: 'Booking status was already set or booking not found.' });
        }

        // --- Refined Point Award Logic ---
        // Award points ONLY if:
        // 1. Status is changing to 'confirmed'
        // 2. Status wasn't already 'confirmed'
        // 3. Payment status is NOT 'paid' (primary check - webhook should handle resets if paid)
        const shouldAwardPoint = 
            status === 'confirmed' && 
            currentStatus !== 'confirmed' && 
            currentPaymentStatus !== 'paid';

        if (shouldAwardPoint) {
            console.log(`Booking ${id} confirmed by admin (Payment status: ${currentPaymentStatus}). Awarding 1 reward point to user ${userId}.`);
            const pointQuery = 'UPDATE users SET reward_points = reward_points + 1 WHERE id = ?';
            await connection.query(pointQuery, [userId]);
        } else if (status === 'confirmed' && currentStatus !== 'confirmed') {
            // Log why point was NOT awarded
            if (currentPaymentStatus === 'paid') {
                 console.log(`Booking ${id} confirmed by admin, but payment status was already 'paid'. Reward point NOT awarded by this action.`);
            } else if (rewardWasAppliedBasedOnMetadata) {
                 // This case should ideally not be hit if payment_status is correct, but log just in case
                 console.log(`Booking ${id} confirmed by admin, but reward metadata indicated reward was applied. Reward point NOT awarded by this action.`);
            } else {
                 // Should not happen if currentStatus !== 'confirmed'
                 console.log(`Booking ${id} confirmed by admin, but conditions not met for point award (currentStatus: ${currentStatus}, paymentStatus: ${currentPaymentStatus}, rewardMetaApplied: ${rewardWasAppliedBasedOnMetadata}).`);
            }
        }

        // Commit transaction
        await connection.commit();

        res.json({ message: 'Booking status updated successfully' });
    } catch (error) {
        await connection.rollback(); // Rollback on any error
        console.error('Error updating booking status:', error);
        res.status(500).json({ message: 'Error updating booking status' });
    } finally {
        if (connection) connection.release(); // Release connection
    }
});

// Get bookings by status
router.get('/bookings/filter/:status', async (req, res) => {
    try {
        const { status } = req.params;
        
        if (!['pending', 'confirmed', 'completed', 'cancelled', 'all'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        let query = `
            SELECT 
                b.*,
                u.first_name,
                u.last_name,
                u.email,
                c.make,
                c.model,
                c.registration_number,
                c.address,
                c.location,
                c.latitude,
                c.longitude
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
        `;

        if (status !== 'all') {
            query += ' WHERE b.status = ?';
        }

        query += ' ORDER BY b.created_at DESC';

        const [bookings] = await db.query(
            query,
            status !== 'all' ? [status] : []
        );

        // Debug log to see what we're getting from the database
        console.log('Raw booking data:', JSON.stringify(bookings[0], null, 2));

        const formattedBookings = bookings.map(booking => {
            // Debug log for each booking's address data
            console.log('Car address data:', {
                address: booking.address,
                location: booking.location,
                latitude: booking.latitude,
                longitude: booking.longitude
            });

            return {
                id: booking.id,
                user_id: booking.user_id,
                car_id: booking.car_id,
                start_date: booking.start_date,
                end_date: booking.end_date,
                status: booking.status,
                total_price: booking.total_price,
                user: {
                    first_name: booking.first_name,
                    last_name: booking.last_name,
                    email: booking.email
                },
                car: {
                    make: booking.make,
                    model: booking.model,
                    registration_number: booking.registration_number,
                    address: booking.address || booking.location || `${booking.latitude}, ${booking.longitude}`
                }
            };
        });

        // Debug log to see what we're sending to frontend
        console.log('Formatted booking data:', JSON.stringify(formattedBookings[0], null, 2));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Error fetching filtered bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);

        // Get user from database
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('No user found with email:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        console.log('Found user:', {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status
        });

        // Compare password
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password validation result:', validPassword);

        if (!validPassword) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from user object
        delete user.password;

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

module.exports = router; 