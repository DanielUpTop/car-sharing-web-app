const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Membership = require('../models/membershipModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/dbConfig');
const crypto = require('crypto');
const authenticateToken = require('../middleware/authenticateToken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwtConfig');
const { subYears, isValid, parseISO, isFuture } = require('date-fns'); // Add isFuture for expiry validation

// Registration route
router.post('/register', async (req, res) => {
    try {
        const { 
            first_name, 
            last_name, 
            email, 
            password, 
            phone_number, 
            driving_license, 
            date_of_birth, 
            driving_license_expiry, // Added
            address,                // Added
            city,                   // Added
            postcode,               // Added
            driving_license_country, // Added
            emergency_contact_name, // Added
            emergency_contact_number, // Added
            verificationToken 
        } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Validate required fields
        const requiredFields = { 
            first_name, last_name, email, password, phone_number, 
            driving_license, date_of_birth, driving_license_expiry, address, city, 
            postcode, driving_license_country, 
            emergency_contact_name, emergency_contact_number, // Added check
            verificationToken 
        };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); 
                return res.status(400).json({ message: `Field '${fieldName}' is required` });
            }
        }

        // Validate Date of Birth format and age (must be 20 or older)
        const dob = parseISO(date_of_birth);
        if (!isValid(dob)) {
            return res.status(400).json({ message: 'Invalid Date of Birth format. Please use YYYY-MM-DD.' });
        }
        const today = new Date();
        const twentyYearsAgo = subYears(today, 20);
        if (dob > twentyYearsAgo) {
            return res.status(400).json({ message: 'User must be at least 20 years old.' });
        }

        // Validate Driving License Expiry date format and ensure it's in the future
        const expiryDate = parseISO(driving_license_expiry);
        if (!isValid(expiryDate)) {
            return res.status(400).json({ message: 'Invalid Driving License Expiry Date format. Please use YYYY-MM-DD.' });
        }
        if (!isFuture(expiryDate)) {
            return res.status(400).json({ message: 'Driving License Expiry Date must be in the future.' });
        }

        // Basic validation for emergency contact number format (similar to frontend)
        const phoneRegex = /^\+?[0-9\s-]{10,15}$/;
        if (!phoneRegex.test(emergency_contact_number)) {
            return res.status(400).json({ message: 'Invalid Emergency Contact Number format.' });
        }

        // Create new user
        const userId = await User.create({
            first_name,
            last_name,
            email,
            password,
            phone_number,
            driving_license,
            date_of_birth: dob, 
            driving_license_expiry: expiryDate, // Pass parsed expiry date
            address,
            city,
            postcode,
            driving_license_country,
            emergency_contact_name, // Added
            emergency_contact_number, // Added
            verification_token: verificationToken,
            is_verified: false
        });

        // Create a 'none' type membership for the user
        try {
            await Membership.create(userId, 'none');
            console.log(`Created 'none' membership for new user ${userId}`);
        } catch (membershipError) {
            console.error(`Error creating default membership for user ${userId}:`, membershipError);
        }

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
        console.log('Login attempt for:', email);
        
        if (!email || !password) {
            console.log('Missing email or password');
            return res.status(400).json({ message: 'Email and password are required' });
        }

        console.log('Querying database for user...');
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        console.log('Found users:', users.length);

        if (users.length === 0) {
            console.log('No user found with email:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];
        console.log('User found:', { id: user.id, email: user.email, role: user.role, status: user.status });

        // Check if user account is blocked/deactivated
        if (user.status === 'blocked') {
            console.log('Login attempt failed: User account is blocked', { userId: user.id, email: user.email });
            return res.status(403).json({ message: 'Account is deactivated/blocked' });
        }

        // Check if email is verified (skip for admin users)
        if (!user.is_verified && user.role !== 'admin') {
            console.log('User not verified:', user.email);
            return res.status(401).json({ 
                message: 'Please verify your email before logging in',
                needsVerification: true
            });
        }

        console.log('Checking password...');
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log('Generating token...');
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                role: user.role 
            }, 
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        console.log('Token generated successfully');

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
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

// Token verification route
router.get('/verify-token', authenticateToken, async (req, res) => {
    try {
        // If we get here, the token is valid (authenticateToken middleware passed)
        const userId = req.user.id;
        
        // Get fresh user data
        const [users] = await db.query(
            'SELECT id, email, role, status, is_verified FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        const user = users[0];

        // Check if user is still active
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'User account is not active' });
        }

        // Check if email is verified (skip for admin users)
        if (!user.is_verified && user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Email not verified',
                needsVerification: true
            });
        }

        res.json({ 
            message: 'Token is valid',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ message: 'Error verifying token' });
    }
});

// Logout route
router.post('/logout', authenticateToken, (req, res) => {
    try {
        // JWT is stateless, so we don't need to invalidate the token on the server
        // The client is responsible for removing the token
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Error logging out' });
    }
});

module.exports = router; 