const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registration route
router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone_number, driving_license } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Validate required fields
        if (!first_name || !last_name || !email || !password || !phone_number || !driving_license) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Create new user
        const userId = await User.create({
            first_name,
            last_name,
            email,
            password,
            phone_number,
            driving_license
        });

        res.status(201).json({
            message: 'User registered successfully',
            userId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Error registering user',
            error: error.message // This will help with debugging
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token with the correct user ID
        const token = jwt.sign(
            { 
                id: user.id,  // Make sure this matches what we check in bookingRoutes
                email: user.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Log the token payload for debugging
        console.log('Token payload:', { id: user.id, email: user.email });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

module.exports = router; 