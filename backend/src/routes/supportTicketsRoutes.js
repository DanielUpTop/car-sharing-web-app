const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/isAdmin');
const supportTicketsController = require('../controllers/supportTicketsController');

// Debug route to check tickets
router.get('/debug', async (req, res) => {
    try {
        const db = require('../config/database');
        const [tickets] = await db.query('SELECT * FROM support_tickets');
        console.log(`Debug: Found ${tickets.length} support tickets`);
        res.json({ count: tickets.length, tickets });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Apply authentication middleware to all routes below
router.use(authenticateToken);

// Get all support tickets
router.get('/', supportTicketsController.getAllTickets);

// Apply admin middleware to admin-only routes below
router.use(isAdmin);

// Get a specific ticket
router.get('/:ticketId', supportTicketsController.getTicketById);

// Update a ticket (status or priority)
router.put('/:ticketId', supportTicketsController.updateTicket);
router.patch('/:ticketId', supportTicketsController.updateTicket);

// Delete a ticket
router.delete('/:ticketId', supportTicketsController.deleteTicket);

// Messages routes
router.get('/:ticketId/messages', supportTicketsController.getTicketMessages);
router.post('/:ticketId/messages', supportTicketsController.addTicketMessage);

module.exports = router; 