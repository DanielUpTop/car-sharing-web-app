const express = require('express');
const router = express.Router();
const Booking = require('../models/bookingModel');
const authenticateToken = require('../middleware/authenticateToken');
const db = require('../config/dbConfig');

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
                error: 'Invalid car_id'
            });
        }

        if (car[0].availability_status !== 'available') {
            await connection.rollback();
            return res.status(400).json({
                message: 'Car has been booked by someone else',
                error: 'Car is not available'
            });
        }

        // Check for overlapping bookings
        const [overlappingBookings] = await connection.query(
            `SELECT * FROM bookings 
             WHERE car_id = ? 
             AND status != 'cancelled'
             AND ((start_date BETWEEN ? AND ?) 
             OR (end_date BETWEEN ? AND ?)
             OR (start_date <= ? AND end_date >= ?))`,
            [car_id, start_date, end_date, start_date, end_date, start_date, end_date]
        );

        if (overlappingBookings.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                message: 'Car is not available for the selected time period',
                error: 'Booking time conflict'
            });
        }

        // Create the booking
        const [result] = await connection.query(
            `INSERT INTO bookings (user_id, car_id, start_date, end_date, total_price, status) 
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [user_id, car_id, start_date, end_date, total_price]
        );

        // Update car availability
        await connection.query(
            'UPDATE cars SET availability_status = ? WHERE id = ?',
            ['booked', car_id]
        );

        await connection.commit();
        console.log('Booking created successfully:', result.insertId);

        res.status(201).json({
            message: 'Booking created successfully',
            bookingId: result.insertId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error creating booking:', error);
        res.status(500).json({
            message: 'Error creating booking',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

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

// Add this route to handle cancellation
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        // Get the car_id from the booking
        const [booking] = await db.query(
            'SELECT car_id FROM bookings WHERE id = ?',
            [req.params.id]
        );

        // Update booking status
        await db.query(
            'UPDATE bookings SET status = ? WHERE id = ?',
            ['cancelled', req.params.id]
        );

        // Restore car availability
        await db.query(
            'UPDATE cars SET availability_status = ? WHERE id = ?',
            ['available', booking[0].car_id]
        );

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ message: 'Error cancelling booking' });
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