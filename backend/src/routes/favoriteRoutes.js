const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const db = require('../config/dbConfig');

// Add to favorites
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { car_id } = req.body;
        const user_id = req.user.id;

        await db.query(
            'INSERT INTO favorites (user_id, car_id) VALUES (?, ?)',
            [user_id, car_id]
        );

        res.status(201).json({ message: 'Added to favorites' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Already in favorites' });
        }
        res.status(500).json({ message: 'Error adding to favorites' });
    }
});

// Remove from favorites
router.delete('/:carId', authenticateToken, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM favorites WHERE user_id = ? AND car_id = ?',
            [req.user.id, req.params.carId]
        );

        res.json({ message: 'Removed from favorites' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing from favorites' });
    }
});

// Get user's favorites
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [favorites] = await db.query(
            `SELECT c.* 
             FROM favorites f
             JOIN cars c ON f.car_id = c.id
             WHERE f.user_id = ?`,
            [req.user.id]
        );

        res.json(favorites);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching favorites' });
    }
});

module.exports = router; 