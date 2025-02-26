const express = require('express');
const router = express.Router();
const Booking = require('../models/bookingModel');
const authenticateToken = require('../middleware/authenticateToken');
const db = require('../config/dbConfig');

// Create a new booking
router.post('/', authenticateToken, async (req, res) => {
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

        // First, verify the user exists
        const [user] = await db.query('SELECT id FROM users WHERE id = ?', [user_id]);
        if (!user.length) {
            return res.status(401).json({
                message: 'User not found',
                error: 'Invalid user ID'
            });
        }

        // Validate required fields
        if (!car_id || !start_date || !end_date || !total_price || !user_id) {
            console.log('Missing required fields:', {
                car_id: !!car_id,
                start_date: !!start_date,
                end_date: !!end_date,
                total_price: !!total_price,
                user_id: !!user_id
            });
            return res.status(400).json({
                message: 'Missing required fields',
                error: 'All fields are required',
                received: { car_id, start_date, end_date, total_price, user_id }
            });
        }

        // Validate car exists
        const [car] = await db.query('SELECT * FROM cars WHERE id = ?', [car_id]);
        if (!car.length) {
            return res.status(404).json({
                message: 'Car not found',
                error: 'Invalid car_id'
            });
        }

        // Check if car is still available
        if (car[0].availability_status !== 'available') {
            return res.status(400).json({
                message: 'Car is no longer available',
                error: 'Car has been booked by someone else'
            });
        }

        // Create the booking
        try {
            const [result] = await db.query(
                `INSERT INTO bookings (user_id, car_id, start_date, end_date, total_price, status) 
                 VALUES (?, ?, ?, ?, ?, 'pending')`,
                [user_id, car_id, start_date, end_date, total_price]
            );

            // Update car availability
            await db.query(
                'UPDATE cars SET availability_status = ? WHERE id = ?',
                ['booked', car_id]
            );

            console.log('Booking created successfully:', result.insertId);

            res.status(201).json({
                message: 'Booking created successfully',
                bookingId: result.insertId
            });
        } catch (dbError) {
            console.error('Database error:', dbError);
            throw new Error(`Database error: ${dbError.message}`);
        }

    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            message: 'Error creating booking',
            error: error.message
        });
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

module.exports = router; 