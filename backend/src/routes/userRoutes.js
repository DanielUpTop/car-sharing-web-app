const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const authenticateToken = require('../middleware/authenticateToken');
const { isValid, parseISO, isFuture } = require('date-fns'); // Add date-fns for validation

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id); // findById now gets driving_license_country
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        delete user.password;
        
        // Format dates if needed
        if (user.date_of_birth instanceof Date) {
            user.date_of_birth = user.date_of_birth.toISOString().split('T')[0];
        }
        if (user.driving_license_expiry instanceof Date) {
            user.driving_license_expiry = user.driving_license_expiry.toISOString().split('T')[0];
        }
        // No need to delete user.country as it shouldn't be selected by findById anymore

        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Error fetching user profile' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { 
            first_name, 
            last_name, 
            email, 
            phone_number, 
            driving_license, 
            date_of_birth, 
            driving_license_expiry, 
            address, 
            city, 
            postcode, 
            driving_license_country // Added
        } = req.body;

        // Validate incoming data
        const updatedData = { ...req.body };

        // Validate Date of Birth if provided
        if (date_of_birth) {
            const dob = parseISO(date_of_birth);
            if (!isValid(dob)) {
                return res.status(400).json({ message: 'Invalid Date of Birth format. Please use YYYY-MM-DD.' });
            }
            // Age validation (20+) - optional for profile update, but good practice
            // const today = new Date();
            // const twentyYearsAgo = subYears(today, 20);
            // if (dob > twentyYearsAgo) {
            //     return res.status(400).json({ message: 'User must be at least 20 years old.' });
            // }
            updatedData.date_of_birth = dob; // Use parsed date
        } else {
             delete updatedData.date_of_birth; // Don't update if not provided or invalid
        }

        // Validate Driving License Expiry if provided
        if (driving_license_expiry) {
            const expiryDate = parseISO(driving_license_expiry);
            if (!isValid(expiryDate)) {
                return res.status(400).json({ message: 'Invalid Driving License Expiry Date format. Please use YYYY-MM-DD.' });
            }
            if (!isFuture(expiryDate)) {
                return res.status(400).json({ message: 'Driving License Expiry Date must be in the future.' });
            }
            updatedData.driving_license_expiry = expiryDate; // Use parsed date
        } else {
            delete updatedData.driving_license_expiry; // Don't update if not provided or invalid
        }
        
        // Check if email is already taken by another user
        if (email && email !== req.user.email) { // Check if email is provided and different
            const existingUser = await User.findByEmail(email);
            if (existingUser && existingUser.id !== req.user.id) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        // Remove fields that shouldn't be directly updated here
        delete updatedData.id;
        delete updatedData.role;
        delete updatedData.status;
        delete updatedData.is_verified;
        delete updatedData.password; // Never update password here
        delete updatedData.verification_token;
        delete updatedData.membership_tier;
        delete updatedData.remaining_cancellations;
        delete updatedData.country; // Explicitly remove country if sent by mistake

        // Ensure only expected fields are passed to the update method
        const allowedUpdates = [
            'first_name', 'last_name', 'email', 'phone_number', 'driving_license', 
            'date_of_birth', 'driving_license_expiry', 'address', 'city', 'postcode', 
            'driving_license_country' // Changed from country
        ];
        const finalUpdateData = {};
        for (const key of allowedUpdates) {
            if (updatedData.hasOwnProperty(key)) {
                finalUpdateData[key] = updatedData[key];
            }
        }

        if (Object.keys(finalUpdateData).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update.' });
        }

        const success = await User.update(req.user.id, finalUpdateData);

        if (!success) {
            // This might mean the user wasn't found, or no rows were affected (data was the same)
            // Check if user exists to differentiate
             const userExists = await User.findById(req.user.id);
            if (!userExists) {
                 return res.status(404).json({ message: 'User not found' });
            } else {
                 // If user exists but no rows affected, it means data was identical
                 // You could return a 200 OK with a specific message or just the generic success
                 console.log('Profile update requested but data was identical.');
            }
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating user profile:', error);
        // Provide more specific error messages if possible
        if (error.code === 'ER_DUP_ENTRY') { // Example: Handle potential duplicate email error from DB
             return res.status(400).json({ message: 'Email already in use.' });
        }
        res.status(500).json({ message: 'Error updating user profile', detail: error.message });
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