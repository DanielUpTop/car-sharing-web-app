const express = require('express');
const router = express.Router();
const Car = require('../models/carModel');
const authenticateToken = require('../middleware/authenticateToken');
const db = require('../config/dbConfig');
const getUserMembership = require('../utils/userUtils').getUserMembership;

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
        // Get user membership if user is authenticated (for informational purposes only)
        let userMembership = 'none';
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                if (token) {
                    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
                    const userId = decoded.id;
                    const membershipData = await getUserMembership(userId);
                    if (membershipData) {
                        userMembership = membershipData.type;
                    }
                }
            } catch (err) {
                console.error('Error checking user membership:', err);
            }
        }

        console.log('User membership level (informational only):', userMembership);

        // Corrected query to exclude cars with active bookings
        // Simplified Query: Rely solely on availability_status
        const query = `
            SELECT c.*, 
                   c.address,
                   c.location
            FROM cars c
            WHERE c.availability_status = 'available'
            /* Removed NOT EXISTS clause:
            AND NOT EXISTS (
                SELECT 1
                FROM bookings b
                WHERE b.car_id = c.id
                AND b.status IN ('pending', 'confirmed')
                -- Optional: Add time constraints here if needed
                -- e.g., AND b.end_date > NOW()
            )
            */
        `;
        console.log("Executing simplified available cars query:", query); 
        const [cars] = await db.query(query);

        // --- Add detailed logging here ---
        console.log("Raw result from db.query:", cars); 
        console.log(`Number of cars fetched directly from DB: ${cars ? cars.length : 'undefined/null'}`);
        // --- End of detailed logging ---
        
        // Process cars to ensure address is properly set and map image_url to image
        const processedCars = cars.map(car => ({
            ...car,
            image: car.image_url, // Map image_url to image for frontend
            address: car.address || car.location || 'No location set for this vehicle',
            required_membership: car.required_membership // Include this in response
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