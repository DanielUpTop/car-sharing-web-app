const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/dbConfig');
const crypto = require('crypto');

// Registration route
router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone_number, driving_license, verificationToken } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Validate required fields
        if (!first_name || !last_name || !email || !password || !phone_number || !driving_license || !verificationToken) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Create new user with verification token from frontend
        const userId = await User.create({
            first_name,
            last_name,
            email,
            password,
            phone_number,
            driving_license,
            verification_token: verificationToken,
            is_verified: false
        });

        res.status(201).json({
            message: 'User registered successfully. Please check your email to verify your account.',
            userId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Error registering user',
            error: error.message
        });
    }
});

// Email verification route
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        console.log('Received verification request with token:', token);

        if (!token) {
            console.log('No token provided in request');
            return res.status(400).json({ message: 'Verification token is required' });
        }

        // Find user with matching verification token
        console.log('Searching for user with token:', token);
        const [users] = await db.query(
            'SELECT * FROM users WHERE verification_token = ?',
            [token]
        );
        console.log('Found users:', users.length);

        if (users.length === 0) {
            console.log('No user found with token:', token);
            return res.status(400).json({ message: 'Invalid verification token' });
        }

        const user = users[0];
        console.log('Found user:', { id: user.id, email: user.email });

        // Update user as verified
        console.log('Updating user verification status');
        await db.query(
            'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = ?',
            [user.id]
        );

        console.log('User verified successfully');
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Error verifying email' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Check if email is verified (skip for admin users)
        if (!user.is_verified && user.role !== 'admin') {
            return res.status(401).json({ 
                message: 'Please verify your email before logging in',
                needsVerification: true
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                role: user.role 
            }, 
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                status: user.status || 'active'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

module.exports = router; 