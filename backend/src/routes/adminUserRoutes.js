const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/adminAuth');
const db = require('../config/dbConfig');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(isAdmin);

// Get all users
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT id, first_name, last_name, email, role, status, created_at
            FROM users
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Get user details
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [user] = await db.query(`
            SELECT id, first_name, last_name, email, role, status, created_at
            FROM users
            WHERE id = ?
        `, [id]);

        if (!user.length) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's booking history
        const [bookings] = await db.query(`
            SELECT b.*, c.make, c.model
            FROM bookings b
            JOIN cars c ON b.car_id = c.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [id]);

        res.json({
            ...user[0],
            bookings
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Error fetching user details' });
    }
});

// Update user status
router.put('/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if user exists and is not an admin
        const [user] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
        
        if (!user.length) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user[0].role === 'admin') {
            return res.status(403).json({ message: 'Cannot modify admin status' });
        }

        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        
        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Error updating user status' });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists and is not an admin
        const [user] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
        
        if (!user.length) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user[0].role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete admin user' });
        }

        // Start transaction
        await db.query('START TRANSACTION');

        // Delete user's bookings
        await db.query('DELETE FROM bookings WHERE user_id = ?', [id]);
        
        // Delete user's ratings
        await db.query('DELETE FROM ratings WHERE user_id = ?', [id]);
        
        // Delete the user
        await db.query('DELETE FROM users WHERE id = ?', [id]);

        // Commit transaction
        await db.query('COMMIT');

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        // Rollback in case of error
        await db.query('ROLLBACK');
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

module.exports = router; 