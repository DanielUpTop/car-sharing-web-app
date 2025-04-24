const express = require('express');
const router = express.Router();
const SupportController = require('../controllers/supportController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// Initialize tables (admin only)
router.post('/initialize', verifyToken, verifyAdmin, SupportController.initializeTables);

// Ticket management routes
router.post('/tickets', verifyToken, SupportController.createTicket);
router.get('/tickets', verifyToken, verifyAdmin, SupportController.getAllTickets);
router.get('/tickets/user/:userId', verifyToken, SupportController.getUserTickets);
router.get('/tickets/:ticketId', verifyToken, SupportController.getTicketById);
router.patch('/tickets/:ticketId', verifyToken, SupportController.updateTicket);

// Ticket messages routes
router.get('/tickets/:ticketId/messages', verifyToken, SupportController.getTicketMessages);
router.post('/tickets/:ticketId/messages', verifyToken, SupportController.addTicketMessage);

// Statistics (admin only)
router.get('/statistics', verifyToken, verifyAdmin, SupportController.getTicketStatistics);

module.exports = router; 