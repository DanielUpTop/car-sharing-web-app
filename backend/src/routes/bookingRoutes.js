const express = require('express');
const router = express.Router();
const Booking = require('../models/bookingModel');
const authenticateToken = require('../middleware/authenticateToken');
const db = require('../config/dbConfig');
const Membership = require('../models/membershipModel');
const MembershipUtils = require('../utils/membershipUtils');
const Cancellation = require('../models/cancellationModel');
const { getUserMembership } = require('../utils/userUtils');

// Create a new booking
router.post('/', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const { car_id, start_date, end_date, total_price } = req.body;
        const user_id = req.user.id;

        console.log('Processing booking request:', {
            car_id,
            start_date,
            end_date,
            total_price,
            user_id
        });

        await connection.beginTransaction();

        // First, verify the user exists
        const [user] = await connection.query('SELECT id FROM users WHERE id = ?', [user_id]);
        if (!user.length) {
            await connection.rollback();
            return res.status(401).json({
                message: 'User not found',
                error: 'Invalid user ID'
            });
        }

        // Validate required fields
        if (!car_id || !start_date || !end_date || !total_price || !user_id) {
            await connection.rollback();
            return res.status(400).json({
                message: 'Missing required fields',
                error: 'All fields are required',
                received: { car_id, start_date, end_date, total_price, user_id }
            });
        }

        // Check if car exists and is available (with row lock)
        const [car] = await connection.query(
            'SELECT * FROM cars WHERE id = ? FOR UPDATE',
            [car_id]
        );

        if (!car.length) {
            await connection.rollback();
            return res.status(404).json({
                message: 'Car not found',
                error: 'Invalid car ID'
            });
        }

        // Check if user has the required membership level to book this car
        const membership = await getUserMembership(user_id);
        const userMembershipType = membership ? membership.type : 'none';
        const requiredMembership = car[0].required_membership;

        if (!canBookWithMembership(userMembershipType, requiredMembership)) {
            await connection.rollback();
            return res.status(403).json({
                message: 'Membership level too low',
                error: `This car requires a ${requiredMembership} membership or higher`,
                required: requiredMembership,
                userHas: userMembershipType
            });
        }

        // Check for overlapping bookings
        const [existingBookings] = await connection.query(
            `SELECT id FROM bookings 
             WHERE car_id = ? 
             AND status NOT IN ('cancelled', 'completed') 
             AND ((start_date BETWEEN ? AND ?) 
             OR (end_date BETWEEN ? AND ?)
             OR (start_date <= ? AND end_date >= ?))`,
            [car_id, start_date, end_date, start_date, end_date, start_date, end_date]
        );

        if (existingBookings.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                message: 'Car already booked for this period',
                error: 'Booking conflict'
            });
        }

        // Insert booking
        const [bookingResult] = await connection.query(
            `INSERT INTO bookings 
             (user_id, car_id, start_date, end_date, total_price, status, payment_status) 
             VALUES (?, ?, ?, ?, ?, 'pending', 'pending')`,
            [user_id, car_id, start_date, end_date, total_price]
        );

        const bookingId = bookingResult.insertId;

        // Apply discounts if membership data was provided
        if (req.body.membership_discount) {
            const { membership_type, original_price, discount_percentage, discount_amount } = req.body.membership_discount;
            
            await connection.query(
                `INSERT INTO booking_discounts 
                 (booking_id, original_price, discounted_price, discount_percentage, membership_type) 
                 VALUES (?, ?, ?, ?, ?)`,
                [bookingId, original_price, total_price, discount_percentage, membership_type]
            );
        }

        // If stripe payment intent ID is provided, update the booking
        if (req.body.payment_intent_id) {
        await connection.query(
                `UPDATE bookings SET stripe_payment_intent_id = ?, payment_status = 'paid'
                 WHERE id = ?`,
                [req.body.payment_intent_id, bookingId]
        );
        }

        await connection.commit();

        res.status(201).json({
            message: 'Booking created successfully',
            bookingId: bookingId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating booking:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Helper function to check if user can book a car with their membership level
function canBookWithMembership(userMembership, requiredMembership) {
    // If no membership required, anyone can book
    if (requiredMembership === 'none') return true;
    
    // Membership hierarchy
    const membershipLevels = {
        'none': 0,
        'basic': 1,
        'premium': 2,
        'platinum': 3
    };
    
    // User must have same or higher membership level
    return membershipLevels[userMembership] >= membershipLevels[requiredMembership];
}

// Get user's bookings
router.get('/user', authenticateToken, async (req, res) => {
    try {
        const bookings = await Booking.getUserBookings(req.user.id);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Update booking status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const success = await Booking.updateStatus(id, status);
        if (success) {
            res.json({ message: 'Booking status updated successfully' });
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ message: 'Error updating booking status' });
    }
});

// Update the cancellation route
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const bookingId = req.params.id;
        const userId = req.user.id;
        
        // Start transaction
        await connection.beginTransaction();
        
        // First check if the booking exists and belongs to the user
        const [booking] = await connection.query(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ?',
            [bookingId, userId]
        );
        
        if (booking.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: 'Booking not found or does not belong to user',
                success: false
            });
        }
        
        // Check if the booking is already cancelled
        if (booking[0].status === 'cancelled') {
            await connection.rollback();
            return res.status(400).json({
                message: 'Booking is already cancelled',
                success: false
            });
        }
        
        // Check if user is eligible for free cancellation based on membership
        const eligibility = await Cancellation.checkEligibility(userId);
        const isFree = eligibility.eligible;
        let membershipType = 'none';
        
        if (eligibility.membership) {
            membershipType = eligibility.membership.type;
        }

        // Update booking status
        await connection.query(
            'UPDATE bookings SET status = ? WHERE id = ?',
            ['cancelled', bookingId]
        );

        // Restore car availability
        await connection.query(
            'UPDATE cars SET availability_status = ? WHERE id = ?',
            ['available', booking[0].car_id]
        );

        // Record the cancellation
        await Cancellation.recordCancellation(userId, bookingId, isFree, membershipType);
        
        // Process refund if eligible for free cancellation
        let refundAmount = 0;
        if (isFree) {
            refundAmount = booking[0].total_price;
            // Here you would add logic to process the actual refund through your payment system
            
            // Record the refund in the database
            await connection.query(
                `INSERT INTO refunds (booking_id, amount, reason, status) 
                 VALUES (?, ?, ?, ?)`,
                [bookingId, refundAmount, 'Free membership cancellation', 'completed']
            );
        }
        
        // Commit transaction
        await connection.commit();
        
        // Return the result with cancellation info
        res.json({
            message: 'Booking cancelled successfully',
            success: true,
            isFree,
            remainingCancellations: eligibility.remainingCancellations,
            refundAmount: refundAmount,
            membership: membershipType
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error cancelling booking:', error);
        res.status(500).json({ 
            message: 'Error cancelling booking',
            success: false,
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// Add a route to get user's remaining cancellations
router.get('/cancellations/remaining', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const eligibility = await Cancellation.checkEligibility(userId);
        
        res.json({
            remainingCancellations: eligibility.remainingCancellations,
            eligible: eligibility.eligible,
            reason: eligibility.reason,
            membership: eligibility.membership ? eligibility.membership.type : 'none'
        });
    } catch (error) {
        console.error('Error checking cancellation eligibility:', error);
        res.status(500).json({ 
            message: 'Error checking cancellation eligibility',
            error: error.message
        });
    }
});

// Add a route to get user's cancellation history
router.get('/cancellations/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const cancellations = await Cancellation.getUserCancellations(userId);
        
        res.json(cancellations);
    } catch (error) {
        console.error('Error fetching cancellation history:', error);
        res.status(500).json({ 
            message: 'Error fetching cancellation history',
            error: error.message
        });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const bookings = await Booking.findByUserId(userId);
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ 
            message: 'Error fetching bookings',
            error: error.message 
        });
    }
});

// Get active bookings that can be insured
router.get('/active', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get bookings that are confirmed but not yet completed or cancelled
        // and don't already have insurance
        const [bookings] = await db.query(
            `SELECT b.id, b.start_date, b.end_date, b.status, c.make as car_make, c.model as car_model
             FROM bookings b
             JOIN cars c ON b.car_id = c.id
             LEFT JOIN insurance_policies ip ON b.id = ip.booking_id
             WHERE b.user_id = ?
             AND b.status IN ('confirmed', 'pending')
             AND ip.id IS NULL
             AND b.end_date > NOW()`,
            [userId]
        );
        
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching active bookings:', error);
        res.status(500).json({ 
            message: 'Error fetching active bookings',
            error: error.message 
        });
    }
});

module.exports = router; 