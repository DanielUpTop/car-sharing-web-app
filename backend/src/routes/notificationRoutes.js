const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const db = require('../config/dbConfig');
const nodemailer = require('nodemailer');

// Configure email transport
const transporter = nodemailer.createTransport({
    // Add your email service configuration
});

router.post('/booking/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;

        // Get booking details with user info
        const [booking] = await db.query(`
            SELECT b.*, u.email, u.first_name, c.make, c.model
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            WHERE b.id = ?
        `, [id]);

        if (!booking.length) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Send email notification
        await transporter.sendMail({
            to: booking[0].email,
            subject: `Booking ${type} - Car Sharing Service`,
            text: `Dear ${booking[0].first_name},\n\nYour booking for ${booking[0].make} ${booking[0].model} has been ${type}...`
        });

        res.json({ message: 'Notification sent successfully' });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ message: 'Error sending notification' });
    }
});

module.exports = router; 