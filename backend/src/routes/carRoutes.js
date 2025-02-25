const express = require('express');
const router = express.Router();
const Car = require('../models/carModel');

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

module.exports = router; 