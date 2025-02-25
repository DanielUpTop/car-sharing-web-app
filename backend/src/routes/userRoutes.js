const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const authenticateToken = require('../middleware/authenticateToken');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Remove sensitive information
        delete user.password;
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching user profile' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { first_name, last_name, email, phone_number, driving_license } = req.body;
        
        // Check if email is already taken by another user
        if (email !== req.user.email) {
            const existingUser = await User.findByEmail(email);
            if (existingUser && existingUser.id !== req.user.id) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        const success = await User.update(req.user.id, {
            first_name,
            last_name,
            email,
            phone_number,
            driving_license
        });

        if (!success) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Error updating user profile' });
    }
});

// Update the dashboard-stats route
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(403).json({ message: 'User ID not found in token' });
        }

        const { timeRange = '6months', startDate, endDate } = req.query;
        
        // Get all user's bookings with their stats
        const stats = await User.getDashboardStats(userId, timeRange, startDate, endDate);
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

module.exports = router; 