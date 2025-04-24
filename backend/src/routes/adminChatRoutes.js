const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const adminChatController = require('../controllers/adminChatController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Admin check middleware
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    next();
};

// Apply admin middleware to all routes
router.use(isAdmin);

// Get all conversations
router.get('/conversations', adminChatController.getConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', adminChatController.getConversationMessages);

// Send a message to a conversation as admin
router.post('/conversations/:conversationId/messages', adminChatController.sendMessage);

// Delete a conversation
router.delete('/conversations/:conversationId', adminChatController.deleteConversation);

module.exports = router; 