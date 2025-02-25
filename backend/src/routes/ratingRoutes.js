const express = require('express');
const router = express.Router();
const Rating = require('../models/ratingModel');
const authenticateToken = require('../middleware/authenticateToken');

// Submit a rating
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { booking_id, car_id, rating, comment } = req.body;
        const user_id = req.user.id;

        const ratingId = await Rating.create({
            booking_id,
            car_id,
            user_id,
            rating,
            comment
        });

        res.status(201).json({ 
            message: 'Rating submitted successfully',
            ratingId 
        });
    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ message: 'Error submitting rating' });
    }
});

// Get ratings for a car
router.get('/car/:carId', async (req, res) => {
    try {
        const { carId } = req.params;
        const ratings = await Rating.getCarRatings(carId);
        const averageRating = await Rating.getAverageRating(carId);
        
        res.json({ ratings, averageRating });
    } catch (error) {
        console.error('Error fetching car ratings:', error);
        res.status(500).json({ message: 'Error fetching car ratings' });
    }
});

module.exports = router; 