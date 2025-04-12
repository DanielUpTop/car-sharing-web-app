const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/dbConfig');

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
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];
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