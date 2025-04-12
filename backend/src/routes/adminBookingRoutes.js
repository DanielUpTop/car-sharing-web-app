const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/adminAuth');
const db = require('../config/dbConfig');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(isAdmin);

// Get all bookings with user and car details
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                b.id,
                b.user_id,
                b.car_id,
                b.start_date,
                b.end_date,
                b.status,
                b.total_price,
                b.created_at,
                u.first_name,
                u.last_name,
                u.email,
                c.make,
                c.model,
                c.registration_number
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            ORDER BY b.created_at DESC
        `;
        
        const [bookings] = await db.query(query);
        
        // Format the data to match the frontend expectations
        const formattedBookings = bookings.map(booking => ({
            id: booking.id,
            user_id: booking.user_id,
            car_id: booking.car_id,
            start_date: booking.start_date,
            end_date: booking.end_date,
            status: booking.status,
            total_price: booking.total_price,
            created_at: booking.created_at,
            user: {
                first_name: booking.first_name,
                last_name: booking.last_name,
                email: booking.email
            },
            car: {
                make: booking.make,
                model: booking.model,
                registration_number: booking.registration_number
            }
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Get booking details by ID
router.get('/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [booking] = await db.query(`
            SELECT 
                b.*,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                u.email as user_email,
                c.make, c.model, c.registration_number,
                c.daily_rate, c.price_per_hour
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            WHERE b.id = ?
        `, [id]);

        if (!booking.length) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.json(booking[0]);
    } catch (error) {
        console.error('Error fetching booking details:', error);
        res.status(500).json({ message: 'Error fetching booking details' });
    }
});

// Update booking status
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const query = 'UPDATE bookings SET status = ? WHERE id = ?';
        await db.query(query, [status, id]);
        
        res.json({ message: 'Booking status updated successfully' });
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ message: 'Error updating booking status' });
    }
});

// Get bookings by status
router.get('/bookings/filter/:status', async (req, res) => {
    try {
        const { status } = req.params;
        
        if (!['pending', 'confirmed', 'completed', 'cancelled', 'all'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        let query = `
            SELECT 
                b.*,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                CONCAT(c.make, ' ', c.model, ' (', c.registration_number, ')') as car_details
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
        `;

        if (status !== 'all') {
            query += ' WHERE b.status = ?';
        }

        query += ' ORDER BY b.created_at DESC';

        const [bookings] = await db.query(
            query,
            status !== 'all' ? [status] : []
        );

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching filtered bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Get all bookings with details
router.get('/bookings', async (req, res) => {
    try {
        const query = `
            SELECT 
                b.*,
                u.first_name, u.last_name, u.email,
                c.make, c.model, c.registration_number
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            ORDER BY b.created_at DESC
        `;
        
        const [bookings] = await db.query(query);
        
        const formattedBookings = bookings.map(booking => ({
            id: booking.id,
            user_id: booking.user_id,
            car_id: booking.car_id,
            start_date: booking.start_date,
            end_date: booking.end_date,
            status: booking.status,
            total_price: booking.total_price,
            user: {
                first_name: booking.first_name,
                last_name: booking.last_name,
                email: booking.email
            },
            car: {
                make: booking.make,
                model: booking.model,
                registration_number: booking.registration_number
            }
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);

        // Get user from database
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('No user found with email:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        console.log('Found user:', {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status
        });

        // Compare password
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password validation result:', validPassword);

        if (!validPassword) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from user object
        delete user.password;

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

module.exports = router; 