const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Start a new conversation
router.post('/conversations', authenticateToken, async (req, res) => {
    try {
        const { subject } = req.body;
        const userId = req.user.id;

        const [result] = await db.query(
            'INSERT INTO conversations (user_id, subject, status) VALUES (?, ?, ?)',
            [userId, subject, 'open']
        );

        // Add welcome message from admin
        const adminId = (await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1'))[0][0].id;
        await db.query(
            'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
            [result.insertId, adminId, "Welcome to our live chat support! How can we assist you today?"]
        );

        res.status(201).json({
            success: true,
            conversationId: result.insertId,
            message: "Conversation started successfully"
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        res.status(500).json({ success: false, message: "Error starting conversation" });
    }
});

// Get all conversations (admin only)
router.get('/conversations/all', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const [conversations] = await db.query(`
            SELECT c.*, u.first_name, u.last_name, u.email,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.updated_at DESC
        `);

        res.json({ success: true, conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ success: false, message: "Error fetching conversations" });
    }
});

// Get user's conversations
router.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const [conversations] = await db.query(`
            SELECT c.*, 
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM conversations c
            WHERE c.user_id = ?
            ORDER BY c.updated_at DESC
        `, [req.user.id]);

        res.json({ success: true, conversations });
    } catch (error) {
        console.error('Error fetching user conversations:', error);
        res.status(500).json({ success: false, message: "Error fetching conversations" });
    }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        // Check if user has access to this conversation
        const [conversation] = await db.query(
            'SELECT * FROM conversations WHERE id = ? AND (user_id = ? OR ? = "admin")',
            [conversationId, req.user.id, req.user.role]
        );

        if (!conversation.length) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const [messages] = await db.query(`
            SELECT m.*, u.first_name, u.last_name, u.role
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
        `, [conversationId]);

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: "Error fetching messages" });
    }
});

// Send a message
router.post('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        // Check if conversation exists and is open
        const [conversation] = await db.query(
            'SELECT * FROM conversations WHERE id = ? AND (user_id = ? OR ? = "admin") AND status = "open"',
            [conversationId, userId, req.user.role]
        );

        if (!conversation.length) {
            return res.status(403).json({ success: false, message: "Access denied or conversation closed" });
        }

        // Insert the message
        const [result] = await db.query(
            'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
            [conversationId, userId, content]
        );

        // Update conversation timestamp
        await db.query(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [conversationId]
        );

        // Get the inserted message with sender details
        const [newMessage] = await db.query(`
            SELECT m.*, u.first_name, u.last_name, u.role
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);

        // Only add automated response if the sender is not an admin and we don't have a system message already
        if (req.user.role !== 'admin') {
            // Check if there was recently a system message sent (within the last minute)
            const [recentSystemMessages] = await db.query(`
                SELECT * FROM messages 
                WHERE conversation_id = ? 
                AND content = "The admin team will get back to you as soon as possible"
                AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
            `, [conversationId]);
            
            // Only add the system message if there wasn't a recent one
            if (recentSystemMessages.length === 0) {
            const adminId = (await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1'))[0][0].id;
                try {
                    // Try with is_system flag
                    await db.query(
                        'INSERT INTO messages (conversation_id, sender_id, content, is_system) VALUES (?, ?, ?, ?)',
                        [conversationId, adminId, "The admin team will get back to you as soon as possible", true]
                    );
                } catch (err) {
                    if (err.code === 'ER_BAD_FIELD_ERROR') {
                        // Fallback if is_system column doesn't exist
                        console.log('is_system column not found, inserting without this field');
            await db.query(
                'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
                [conversationId, adminId, "The admin team will get back to you as soon as possible"]
            );
                    } else {
                        throw err; // Re-throw if it's a different error
                    }
                }
            }
        }

        res.json({ 
            success: true, 
            message: newMessage[0]
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: "Error sending message" });
    }
});

// Mark messages as read
router.post('/conversations/:conversationId/read', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        // Check if user has access to this conversation
        const [conversation] = await db.query(
            'SELECT * FROM conversations WHERE id = ? AND (user_id = ? OR ? = "admin")',
            [conversationId, req.user.id, req.user.role]
        );

        if (!conversation.length) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Mark all messages as read
        await db.query(
            'UPDATE messages SET is_read = true WHERE conversation_id = ? AND sender_id != ?',
            [conversationId, req.user.id]
        );

        res.json({ success: true, message: "Messages marked as read" });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ success: false, message: "Error marking messages as read" });
    }
});

// Close conversation
router.put('/conversations/:conversationId/close', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        // Check if user has access to close this conversation
        const [conversation] = await db.query(
            'SELECT * FROM conversations WHERE id = ? AND (user_id = ? OR ? = "admin")',
            [conversationId, req.user.id, req.user.role]
        );

        if (!conversation.length) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        await db.query(
            'UPDATE conversations SET status = "closed" WHERE id = ?',
            [conversationId]
        );

        res.json({ success: true, message: "Conversation closed successfully" });
    } catch (error) {
        console.error('Error closing conversation:', error);
        res.status(500).json({ success: false, message: "Error closing conversation" });
    }
});

// Get chat history for the current user
router.get('/history', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching chat history for user:', req.user?.id);
        
        if (!req.user || !req.user.id) {
            console.log('No authenticated user found for chat history');
            return res.status(401).json({ success: false, message: "Unauthorized - user not authenticated" });
        }
        
        const userId = req.user.id;
        
        // First check if conversations table exists
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS conversations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    subject VARCHAR(255),
                    status ENUM('open', 'closed', 'archived') DEFAULT 'open',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            
            await db.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    conversation_id INT NOT NULL,
                    sender_id INT NOT NULL,
                    content TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT false,
                    is_system BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('Conversations and messages tables created or verified');
        } catch (err) {
            console.log('Error creating or verifying tables:', err.message);
            // Continue anyway, attempt to query
        }
        
        // Find the user's conversations
        try {
            const [conversations] = await db.query(
                'SELECT id FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
                [userId]
            );
            
            console.log('Found conversations for user:', conversations.length);
            
            // If no conversations exist, create a welcome conversation
            if (!conversations.length) {
                console.log('No existing conversations found, creating welcome message');
                
                // Get admin ID or use a fallback
                let adminId = 1;  // Default fallback
                try {
                    const [adminResult] = await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
                    if (adminResult && adminResult.length > 0) {
                        adminId = adminResult[0].id;
                    }
                } catch (err) {
                    console.log('Error finding admin user, using default ID:', err.message);
                }
                
                // Create new conversation
                const [convResult] = await db.query(
                    `INSERT INTO conversations (user_id, subject, status)
                     VALUES (?, 'Welcome', 'open')`,
                    [userId]
                );
                
                const conversationId = convResult.insertId;
                console.log('Created new conversation with ID:', conversationId);
                
                // Add welcome message
                await db.query(
                    'INSERT INTO messages (conversation_id, sender_id, content, is_read) VALUES (?, ?, ?, ?)',
                    [conversationId, adminId, "Welcome to our support chat! How can we help you today?", false]
                );
                
                // Get the welcome message
                const [messages] = await db.query(`
                    SELECT 
                        m.id, 
                        m.content, 
                        m.sender_id as senderId, 
                        CONCAT(u.first_name, ' ', u.last_name) as senderName,
                        m.created_at as timestamp, 
                        u.role = 'admin' as isAdmin
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.conversation_id = ?
                    ORDER BY m.created_at ASC
                `, [conversationId]);
                
                console.log('Returning new welcome message');
                return res.json(messages);
            }
            
            // Otherwise, get messages for the most recent conversation
            const conversationId = conversations[0].id;
            console.log('Fetching messages for conversation:', conversationId);
            
            const [messages] = await db.query(`
                SELECT 
                    m.id, 
                    m.content, 
                    m.sender_id as senderId, 
                    CONCAT(u.first_name, ' ', u.last_name) as senderName,
                    m.created_at as timestamp, 
                    u.role = 'admin' as isAdmin
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = ?
                ORDER BY m.created_at ASC
            `, [conversationId]);
            
            console.log(`Found ${messages.length} messages for conversation`);
            res.json(messages);
        } catch (error) {
            console.error('Database error during chat history fetch:', error);
            
            // If there's a database error, return the fallback history
            const sampleMessages = [
                {
                    id: 1,
                    content: "Welcome to our support chat! How can we help you today?",
                    senderId: 999,
                    senderName: "Support Agent",
                    timestamp: new Date().toISOString(),
                    isAdmin: true
                }
            ];
            
            console.log('Returning fallback chat history due to error');
            res.json(sampleMessages);
        }
    } catch (error) {
        console.error('Error fetching chat history:', error);
        
        // Return fallback history even on unexpected errors
        const sampleMessages = [
            {
                id: 1,
                content: "Welcome to our support chat! How can we help you today?",
                senderId: 999,
                senderName: "Support Agent",
                timestamp: new Date().toISOString(),
                isAdmin: true
            }
        ];
        
        res.json(sampleMessages);
    }
});

// Simple test endpoint to provide history without DB access (fallback)
router.get('/simple-chat-history', (req, res) => {
    // Return a welcome message
    const sampleMessages = [
        {
            id: 1,
            content: "Welcome to our support chat! How can we help you today?",
            senderId: 999,
            senderName: "Support Agent",
            timestamp: new Date().toISOString(),
            isAdmin: true
        }
    ];
    
    res.json(sampleMessages);
});

// Submit rating for a conversation
router.post('/conversations/:conversationId/rating', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { rating } = req.body;
        
        if (!rating || rating < 1 || rating > 10) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid rating. Please provide a rating from 1 to 10." 
            });
        }
        
        // Check if user has access to this conversation
        const [conversation] = await db.query(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [conversationId, req.user.id]
        );

        if (!conversation.length) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }
        
        // Add a message about the rating (as system message with NULL sender)
        await db.query(
            'INSERT INTO messages (conversation_id, sender_id, content, is_system) VALUES (?, NULL, ?, TRUE)',
            [conversationId, `User rated this conversation: ${rating}/10 stars`]
        );

        res.json({ success: true, message: "Rating submitted successfully" });
    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ success: false, message: "Error submitting rating" });
    }
});

// Delete conversation (admin only)
router.delete('/conversations/:conversationId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Access denied. Only admins can delete conversations." });
        }

        const { conversationId } = req.params;

        // Check if conversation exists before deleting
        const [conversation] = await db.query(
            'SELECT id FROM conversations WHERE id = ?',
            [conversationId]
        );

        if (!conversation.length) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        // Perform deletion (database should handle cascading deletes for messages)
        await db.query(
            'DELETE FROM conversations WHERE id = ?',
            [conversationId]
        );

        console.log(`Admin ${req.user.id} deleted conversation ${conversationId}`);

        // Respond with success (204 No Content is often used for successful DELETE)
        res.status(204).send();

    } catch (error) {
        console.error('Error deleting conversation:', error);
        // Check for specific foreign key errors if cascade delete is not set up
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(500).json({ success: false, message: "Cannot delete conversation because related messages exist. Ensure cascade delete is configured or delete messages first." });
        }
        res.status(500).json({ success: false, message: "Error deleting conversation." });
    }
});

module.exports = router; 