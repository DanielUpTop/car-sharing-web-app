const express = require('express');
const router = express.Router();
const db = require('../config/dbConfig');
const authenticateToken = require('../middleware/authenticateToken');

// Get all FAQs
router.get('/faqs', authenticateToken, async (req, res) => {
    console.log('GET /faqs request received');
    try {
        const [faqs] = await db.query('SELECT * FROM faqs ORDER BY category, id');
        console.log('FAQs fetched:', faqs.length);
        res.json(faqs);
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        res.status(500).json({ message: 'Error fetching FAQs' });
    }
});

// Get all help guides
router.get('/guides', authenticateToken, async (req, res) => {
    console.log('GET /guides request received');
    try {
        const [guides] = await db.query('SELECT * FROM help_guides ORDER BY category, title');
        console.log('Guides fetched:', guides.length);
        res.json(guides);
    } catch (error) {
        console.error('Error fetching help guides:', error);
        res.status(500).json({ message: 'Error fetching help guides' });
    }
});

// Get user's support tickets
router.get('/tickets', authenticateToken, async (req, res) => {
    console.log('GET /tickets request received, user:', req.user.id);
    try {
        const [tickets] = await db.query(
            'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        console.log('Tickets fetched:', tickets.length);
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({ message: 'Error fetching support tickets' });
    }
});

// Create a new support ticket
router.post('/tickets', authenticateToken, async (req, res) => {
    console.log('POST /tickets request received');
    try {
        const { subject, description, priority } = req.body;
        
        if (!subject || !description) {
            return res.status(400).json({ message: 'Subject and description are required' });
        }

        const [result] = await db.query(
            `INSERT INTO support_tickets (user_id, subject, description, priority) 
             VALUES (?, ?, ?, ?)`,
            [req.user.id, subject, description, priority || 'medium']
        );

        const [newTicket] = await db.query(
            'SELECT * FROM support_tickets WHERE id = ?',
            [result.insertId]
        );

        console.log('New ticket created:', newTicket[0]);
        res.status(201).json(newTicket[0]);
    } catch (error) {
        console.error('Error creating support ticket:', error);
        res.status(500).json({ message: 'Error creating support ticket' });
    }
});

// Update a support ticket
router.put('/tickets/:id', authenticateToken, async (req, res) => {
    console.log('PUT /tickets/:id request received');
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Verify ticket belongs to user
        const [ticket] = await db.query(
            'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (!ticket.length) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        await db.query(
            'UPDATE support_tickets SET status = ? WHERE id = ?',
            [status, id]
        );

        console.log('Ticket updated:', id);
        res.json({ message: 'Ticket updated successfully' });
    } catch (error) {
        console.error('Error updating support ticket:', error);
        res.status(500).json({ message: 'Error updating support ticket' });
    }
});

// Get messages for a specific ticket
router.get('/tickets/:ticketId/messages', authenticateToken, async (req, res) => {
    console.log(`GET /tickets/${req.params.ticketId}/messages request received`);
    try {
        const { ticketId } = req.params;
        
        // Verify ticket belongs to user
        const [ticket] = await db.query(
            'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
            [ticketId, req.user.id]
        );

        if (!ticket.length) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Check which table exists - we have two possible names
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'car_sharing_db' 
            AND TABLE_NAME IN ('ticket_messages', 'support_ticket_messages')
        `);
        
        console.log('Available message tables:', tables);
        
        let messages = [];
        
        if (tables.length > 0) {
            // Use the first table found
            const tableName = tables[0].TABLE_NAME;
            console.log(`Using table ${tableName} to fetch messages`);
            
            // Fetch ticket messages
            const [fetchedMessages] = await db.query(
                `SELECT tm.*, u.first_name as user_name, u.last_name as user_last_name, 
                 a.name as admin_name
                 FROM ${tableName} tm
                 LEFT JOIN users u ON tm.user_id = u.id
                 LEFT JOIN admins a ON tm.admin_id = a.id
                 WHERE tm.ticket_id = ?
                 ORDER BY tm.created_at ASC`,
                [ticketId]
            );
            
            messages = fetchedMessages;
        } else {
            console.log('No message tables found!');
            // Try to create the table since it doesn't exist
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS ticket_messages (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        ticket_id INT NOT NULL,
                        user_id INT,
                        admin_id INT,
                        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                        message TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
                    )
                `);
                console.log('Created ticket_messages table');
                
                // Add a default message for this ticket if it's resolved/closed
                const [ticketStatus] = await db.query(
                    'SELECT status FROM support_tickets WHERE id = ?',
                    [ticketId]
                );
                
                if (ticketStatus.length > 0 && 
                    ['resolved', 'closed'].includes(ticketStatus[0].status)) {
                    await db.query(
                        `INSERT INTO ticket_messages (ticket_id, admin_id, is_admin, message) 
                         VALUES (?, 1, TRUE, ?)`,
                        [ticketId, "Your issue has been resolved by our support team."]
                    );
                    console.log('Added default message to the newly created table');
                }
            } catch (createErr) {
                console.error('Error creating ticket_messages table:', createErr);
            }
        }
        
        console.log(`Fetched ${messages.length} messages for ticket ${ticketId}`);
        res.json(messages);
    } catch (error) {
        console.error(`Error fetching messages for ticket ${req.params.ticketId}:`, error);
        res.status(500).json({ message: 'Error fetching ticket messages', error: error.message });
    }
});

// Debug endpoint to check ticket_messages table
router.get('/debug/ticket-messages', authenticateToken, async (req, res) => {
    console.log('GET /debug/ticket-messages request received');
    try {
        // Check for both possible table names
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'car_sharing_db' 
            AND TABLE_NAME IN ('ticket_messages', 'support_ticket_messages')
        `);
        
        const existingTables = tables.map(t => t.TABLE_NAME);
        console.log('Available message tables:', existingTables);
        
        const tableExists = existingTables.length > 0;
        const tableName = tableExists ? existingTables[0] : null;
        
        let messages = [];
        let ticketCounts = {};
        let error = null;
        
        if (tableExists) {
            try {
                // Try to get all messages
                const [allMessages] = await db.query(`SELECT * FROM ${tableName} LIMIT 20`);
                messages = allMessages;
                
                // Count messages by ticket
                const [countResult] = await db.query(
                    `SELECT ticket_id, COUNT(*) as count FROM ${tableName} GROUP BY ticket_id`
                );
                ticketCounts = countResult.reduce((acc, row) => {
                    acc[row.ticket_id] = row.count;
                    return acc;
                }, {});
                
                console.log(`Found ${messages.length} messages in ${tableName} table`);
                console.log('Message counts by ticket:', ticketCounts);
            } catch (tableErr) {
                error = tableErr.message;
                console.error(`Error querying ${tableName} table:`, tableErr);
            }
        } else {
            console.log('No message tables found in database');
        }
        
        // Check if the support_tickets table exists and has any resolved/closed tickets
        const [ticketsResult] = await db.query(`
            SELECT id, status FROM support_tickets 
            WHERE status IN ('resolved', 'closed') 
            LIMIT 10
        `);
        
        const resolvedTickets = ticketsResult || [];
        
        res.json({
            tableExists,
            tablesFound: existingTables,
            activeTable: tableName,
            tableStructure: tableExists ? await getTableStructure(tableName) : null,
            messages,
            ticketCounts,
            resolvedTickets: resolvedTickets,
            error
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ 
            message: 'Error in debug endpoint', 
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint to check support_tickets table
router.get('/debug/support-tickets', authenticateToken, async (req, res) => {
    console.log('GET /debug/support-tickets request received');
    try {
        // Check if table exists
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'car_sharing_db' 
            AND TABLE_NAME = 'support_tickets'
        `);
        
        const tableExists = tables.length > 0;
        
        let tickets = [];
        let error = null;
        
        if (tableExists) {
            try {
                // Try to get all tickets
                const [allTickets] = await db.query('SELECT * FROM support_tickets LIMIT 10');
                tickets = allTickets;
            } catch (tableErr) {
                error = tableErr.message;
            }
        }
        
        // Check for the ticket with the provided ID if available
        let specificTicket = null;
        const ticketId = req.query.ticketId;
        
        if (ticketId && tableExists) {
            try {
                const [ticketData] = await db.query(
                    'SELECT * FROM support_tickets WHERE id = ?',
                    [ticketId]
                );
                
                if (ticketData.length > 0) {
                    specificTicket = ticketData[0];
                    
                    // Also get messages for this ticket if the ticket_messages table exists
                    const [ticketMsgTables] = await db.query(`
                        SELECT TABLE_NAME 
                        FROM INFORMATION_SCHEMA.TABLES
                        WHERE TABLE_SCHEMA = 'car_sharing_db' 
                        AND TABLE_NAME = 'ticket_messages'
                    `);
                    
                    if (ticketMsgTables.length > 0) {
                        const [ticketMsgs] = await db.query(
                            'SELECT * FROM ticket_messages WHERE ticket_id = ?',
                            [ticketId]
                        );
                        specificTicket.messages = ticketMsgs;
                    }
                }
            } catch (specificErr) {
                error = error || specificErr.message;
            }
        }
        
        res.json({
            tableExists,
            tableStructure: tableExists ? await getSupportTicketsStructure() : null,
            tickets,
            specificTicket,
            error
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ message: 'Error in debug endpoint', error: error.message });
    }
});

// Debug endpoint to initialize ticket_messages table and add test message
router.post('/debug/initialize-tickets', authenticateToken, async (req, res) => {
    console.log('POST /debug/initialize-tickets request received', req.body);
    try {
        // Check for both possible table names
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'car_sharing_db' 
            AND TABLE_NAME IN ('ticket_messages', 'support_ticket_messages')
        `);
        
        const existingTables = tables.map(t => t.TABLE_NAME);
        console.log('Existing message tables:', existingTables);
        
        let tableExists = existingTables.length > 0;
        let tableName = tableExists ? existingTables[0] : 'ticket_messages';
        let tableCreated = false;
        let messageAdded = false;
        let error = null;
        
        // Create the table if it doesn't exist
        if (!tableExists) {
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS ticket_messages (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        ticket_id INT NOT NULL,
                        user_id INT,
                        admin_id INT,
                        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                        message TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
                    )
                `);
                tableCreated = true;
                tableName = 'ticket_messages';
                console.log('Created ticket_messages table');
            } catch (createErr) {
                error = createErr.message;
                console.error('Error creating ticket_messages table:', createErr);
            }
        }
        
        // Add a test message to the specified ticket
        if ((tableExists || tableCreated) && req.body.ticketId) {
            try {
                // Check if the ticket exists
                const [ticketCheck] = await db.query(
                    'SELECT * FROM support_tickets WHERE id = ?',
                    [req.body.ticketId]
                );
                
                if (ticketCheck.length === 0) {
                    throw new Error(`Ticket with ID ${req.body.ticketId} not found`);
                }
                
                // Add an admin message
                await db.query(
                    `INSERT INTO ${tableName} (ticket_id, admin_id, is_admin, message) 
                     VALUES (?, 1, TRUE, ?)`,
                    [req.body.ticketId, req.body.message || "This is a test admin response message."]
                );
                messageAdded = true;
                console.log(`Added message to ticket ${req.body.ticketId} in ${tableName} table`);
                
                // If this is a resolved/closed ticket, make sure it has a resolution message
                if (['resolved', 'closed'].includes(ticketCheck[0].status) && !ticketCheck[0].resolution_message) {
                    try {
                        await db.query(
                            'UPDATE support_tickets SET resolution_message = ? WHERE id = ?',
                            [req.body.message || "This is a test admin response message.", req.body.ticketId]
                        );
                        console.log(`Updated resolution_message for ticket ${req.body.ticketId}`);
                    } catch (updateErr) {
                        console.error('Error updating resolution_message:', updateErr);
                    }
                }
            } catch (messageErr) {
                error = messageErr.message;
                console.error('Error adding message:', messageErr);
            }
        } else if (!req.body.ticketId) {
            error = "No ticketId provided in request body";
            console.error('No ticketId provided in request body');
        }
        
        // Return detailed information about what was done
        res.json({
            tableExists,
            tableName,
            tableCreated,
            messageAdded,
            error
        });
    } catch (error) {
        console.error('Error in initialize endpoint:', error);
        res.status(500).json({ message: 'Error in initialize endpoint', error: error.message });
    }
});

async function getTableStructure(tableName = 'ticket_messages') {
    const [columns] = await db.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'car_sharing_db'
        AND TABLE_NAME = ?
    `, [tableName]);
    return columns;
}

async function getSupportTicketsStructure() {
    const [columns] = await db.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'car_sharing_db'
        AND TABLE_NAME = 'support_tickets'
    `);
    return columns;
}

module.exports = router; 