const db = require('../config/database');

/**
 * Get all support tickets with user details
 */
const getAllTickets = async (req, res) => {
    try {
        let query = `
            SELECT t.*, 
                u.first_name, 
                u.last_name, 
                u.email,
                u.id as user_id,
                'General' as category,
                NULL as last_reply_at,
                NULL as last_reply_by
            FROM support_tickets t
            JOIN users u ON t.user_id = u.id
        `;
        
        const queryParams = [];
        
        // If not admin, only show user's own tickets
        if (!req.user.isAdmin) {
            query += ` WHERE t.user_id = ?`;
            queryParams.push(req.user.id);
        }
        
        query += ` 
            ORDER BY 
                CASE t.status
                    WHEN 'open' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'resolved' THEN 3
                    WHEN 'closed' THEN 4
                END,
                CASE t.priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END,
                t.created_at DESC
        `;

        const [tickets] = await db.query(query, queryParams);

        // Format tickets to include user information
        const formattedTickets = tickets.map(ticket => ({
            id: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category || 'General',
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            last_reply_at: ticket.last_reply_at,
            last_reply_by: ticket.last_reply_by,
            user: {
                id: ticket.user_id,
                first_name: ticket.first_name,
                last_name: ticket.last_name,
                email: ticket.email
            }
        }));

        res.json(formattedTickets);
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({ 
            message: 'Error fetching support tickets',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get a specific ticket by ID
 */
const getTicketById = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        const [tickets] = await db.query(`
            SELECT t.*, 
                u.first_name, 
                u.last_name, 
                u.email
            FROM support_tickets t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        `, [ticketId]);

        if (!tickets.length) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        const ticket = tickets[0];
        const formattedTicket = {
            id: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            user: {
                id: ticket.user_id,
                first_name: ticket.first_name,
                last_name: ticket.last_name,
                email: ticket.email
            }
        };

        res.json(formattedTicket);
    } catch (error) {
        console.error('Error fetching support ticket:', error);
        res.status(500).json({ 
            message: 'Error fetching support ticket',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update a ticket's status or priority
 */
const updateTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, priority } = req.body;
        
        // Check if ticket exists
        const [ticket] = await db.query(
            'SELECT * FROM support_tickets WHERE id = ?',
            [ticketId]
        );

        if (!ticket.length) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Update the ticket
        const updates = {};
        if (status) updates.status = status;
        if (priority) updates.priority = priority;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid updates provided' });
        }

        await db.query(
            'UPDATE support_tickets SET ? WHERE id = ?',
            [updates, ticketId]
        );

        res.json({ message: 'Support ticket updated successfully' });
    } catch (error) {
        console.error('Error updating support ticket:', error);
        res.status(500).json({ 
            message: 'Error updating support ticket',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Delete a ticket
 */
const deleteTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        // Check if ticket exists
        const [ticket] = await db.query(
            'SELECT * FROM support_tickets WHERE id = ?',
            [ticketId]
        );

        if (!ticket.length) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Delete the ticket
        await db.query('DELETE FROM support_tickets WHERE id = ?', [ticketId]);

        res.json({ message: 'Support ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting support ticket:', error);
        res.status(500).json({ 
            message: 'Error deleting support ticket',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get messages for a ticket
 */
const getTicketMessages = async (req, res) => {
    try {
        const { ticketId } = req.params;
        
        // Check if ticket exists
        const [ticket] = await db.query(
            'SELECT * FROM support_tickets WHERE id = ?',
            [ticketId]
        );

        if (!ticket.length) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Create messages table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS support_ticket_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                user_id INT,
                admin_id INT,
                is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                message TEXT NOT NULL,
                attachments JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
            )
        `);
        
        // Get messages
        const [messages] = await db.query(
            'SELECT * FROM support_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
            [ticketId]
        );
        
        res.json(messages);
    } catch (error) {
        console.error('Error fetching ticket messages:', error);
        res.status(500).json({ 
            message: 'Error fetching ticket messages',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Add a message to a ticket
 */
const addTicketMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { message, is_admin } = req.body;
        
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }
        
        // Check if ticket exists
        const [ticket] = await db.query(
            'SELECT * FROM support_tickets WHERE id = ?',
            [ticketId]
        );

        if (!ticket.length) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Create messages table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS support_ticket_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                user_id INT,
                admin_id INT,
                is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                message TEXT NOT NULL,
                attachments JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
            )
        `);
        
        // Add message
        const userId = req.user.id;
        const adminId = req.user.isAdmin ? userId : null;
        const regularUserId = !req.user.isAdmin ? userId : null;
        
        const [result] = await db.query(
            `INSERT INTO support_ticket_messages 
             (ticket_id, user_id, admin_id, is_admin, message) 
             VALUES (?, ?, ?, ?, ?)`,
            [ticketId, regularUserId, adminId, is_admin || false, message]
        );
        
        // Get the new message
        const [newMessage] = await db.query(
            'SELECT * FROM support_ticket_messages WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(newMessage[0]);
    } catch (error) {
        console.error('Error adding ticket message:', error);
        res.status(500).json({ 
            message: 'Error adding ticket message',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    getTicketMessages,
    addTicketMessage
}; 