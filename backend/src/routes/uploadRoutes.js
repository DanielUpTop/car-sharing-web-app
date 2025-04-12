const express = require('express');
const router = express.Router();
const upload = require('../config/storageConfig');
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/adminAuth');
const path = require('path');
const fs = require('fs').promises;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Protected upload route
router.post('/upload', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Create URL for the uploaded file
        const imageUrl = `http://localhost:5001/uploads/${req.file.filename}`;

        // Save the image URL to the database if needed
        // You might want to associate this with a car or store it separately

        res.json({
            message: 'File uploaded successfully',
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Error uploading file' });
    }
});

// Route to handle image deletion
router.delete('/upload/:filename', authenticateToken, isAdmin, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(uploadsDir, filename);

        await fs.unlink(filepath);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting file' });
    }
});

module.exports = router; 