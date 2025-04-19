const express = require('express');
const router = express.Router();
const Car = require('../models/carModel');
const authenticateToken = require('../middleware/authenticateToken');
const db = require('../config/dbConfig');

// Get all cars
router.get('/', async (req, res) => {
    try {
        const cars = await Car.findAll();
        res.json(cars);
    } catch (error) {
        console.error('Error fetching cars:', error);
        res.status(500).json({ message: 'Error fetching cars' });
    }
});

// Public route for available cars
router.get('/available', async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   c.address,
                   c.location,
                   COALESCE(b.status, 'none') as booking_status
            FROM cars c
            LEFT JOIN bookings b ON c.id = b.car_id 
                AND b.status NOT IN ('cancelled', 'completed')
                AND NOW() BETWEEN b.start_date AND b.end_date
            WHERE c.availability_status = 'available'
            AND (b.id IS NULL OR b.status = 'cancelled')
        `;
        const [cars] = await db.query(query);
        
        // Process cars to ensure address is properly set
        const processedCars = cars.map(car => ({
            ...car,
            address: car.address || car.location || 'No location set for this vehicle'
        }));
        
        res.json(processedCars);
    } catch (error) {
        console.error('Error fetching available cars:', error);
        res.status(500).json({ message: 'Error fetching available cars' });
    }
});

// Protected route for nearby cars
router.get('/nearby', authenticateToken, async (req, res) => {
    try {
        const { lat, lng, radius = 5 } = req.query;
        const cars = await Car.findByLocation(lat, lng, radius);
        res.json(cars);
    } catch (error) {
        console.error('Error fetching nearby cars:', error);
        res.status(500).json({ message: 'Error fetching nearby cars' });
    }
});

module.exports = router; 