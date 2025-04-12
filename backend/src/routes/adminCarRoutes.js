const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/adminAuth');
const db = require('../config/dbConfig');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(isAdmin);

// Get all cars (admin view)
router.get('/cars', async (req, res) => {
    try {
        const [cars] = await db.query(`
            SELECT * FROM cars
            ORDER BY created_at DESC
        `);
        res.json(cars);
    } catch (error) {
        console.error('Error fetching cars:', error);
        res.status(500).json({ message: 'Error fetching cars' });
    }
});

// Add new car
router.post('/cars', async (req, res) => {
    try {
        const {
            make,
            model,
            year,
            registration_number,
            daily_rate,
            price_per_hour,
            type,
            seats,
            availability_status
        } = req.body;

        const [result] = await db.query(`
            INSERT INTO cars (
                make,
                model,
                year,
                registration_number,
                daily_rate,
                price_per_hour,
                type,
                seats,
                availability_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            make,
            model,
            year,
            registration_number,
            daily_rate,
            price_per_hour,
            type,
            seats,
            availability_status
        ]);

        const [newCar] = await db.query('SELECT * FROM cars WHERE id = ?', [result.insertId]);
        res.status(201).json(newCar[0]);
    } catch (error) {
        console.error('Error adding car:', error);
        res.status(500).json({ message: 'Error adding car' });
    }
});

// Update car
router.put('/cars/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            make,
            model,
            year,
            registration_number,
            daily_rate,
            price_per_hour,
            type,
            seats,
            availability_status
        } = req.body;

        await db.query(`
            UPDATE cars
            SET make = ?,
                model = ?,
                year = ?,
                registration_number = ?,
                daily_rate = ?,
                price_per_hour = ?,
                type = ?,
                seats = ?,
                availability_status = ?
            WHERE id = ?
        `, [
            make,
            model,
            year,
            registration_number,
            daily_rate,
            price_per_hour,
            type,
            seats,
            availability_status,
            id
        ]);

        const [updatedCar] = await db.query('SELECT * FROM cars WHERE id = ?', [id]);
        res.json(updatedCar[0]);
    } catch (error) {
        console.error('Error updating car:', error);
        res.status(500).json({ message: 'Error updating car' });
    }
});

// Delete car
router.delete('/cars/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM cars WHERE id = ?', [id]);
        res.json({ message: 'Car deleted successfully' });
    } catch (error) {
        console.error('Error deleting car:', error);
        res.status(500).json({ message: 'Error deleting car' });
    }
});

module.exports = router; 