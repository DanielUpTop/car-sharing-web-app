const express = require('express');
const router = express.Router();
const axios = require('axios');

// Proxy forward search requests to Nominatim
router.get('/', async (req, res) => {
    try {
        const { q, limit = 7 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q,
                format: 'json',
                limit,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'CarSharingApp/1.0',
                'Accept-Language': req.headers['accept-language'] || 'en'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({ error: 'Failed to perform geocoding search' });
    }
});

// Proxy reverse geocoding requests
router.get('/reverse', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
                lat,
                lon,
                format: 'json'
            },
            headers: {
                'User-Agent': 'CarSharingApp/1.0',
                'Accept-Language': req.headers['accept-language'] || 'en'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        res.status(500).json({ error: 'Failed to perform reverse geocoding' });
    }
});

module.exports = router; 