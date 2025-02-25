const express = require('express');
const router = express.Router();
const Booking = require('../models/bookingModel');
const authenticateToken = require('../middleware/authenticateToken');

// Create a new booking
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { car_id, start_date, end_date, total_price } = req.body;
        
        // Log everything for debugging
        console.log('Token user:', req.user);
        console.log('Request body:', req.body);
        
        // Try both ways of getting user ID
        const user_id = req.user.id || req.user.userId;
        
        if (!user_id) {
            return res.status(400).json({ 
                message: 'User ID not found', 
                debug: { user: req.user } 
            });
        }

        const bookingData = {
            user_id,
            car_id,
            start_date,
            end_date,
            total_price,
            status: 'pending'
        };

        console.log('Final booking data:', bookingData);

        const bookingId = await Booking.create(bookingData);
        
        res.status(201).json({ 
            message: 'Booking created successfully',
            bookingId 
        });
    } catch (error) {
        console.error('Detailed booking error:', {
            message: error.message,
            user: req.user,
            body: req.body
        });
        
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
        const bookingId = req.params.id;
        const success = await Booking.updateStatus(bookingId, 'cancelled');
        
        if (!success) {
            return res.status(404).json({ message: 'Booking not found' });
        }

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