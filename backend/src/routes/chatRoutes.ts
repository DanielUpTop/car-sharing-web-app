import { Router } from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth';
import pool from '../config/database';
import { AuthRequest } from '../types/express';
import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';

// Define Response type locally if can't import it
type Response = any;
type NextFunction = any;

interface ChatMessage extends RowDataPacket {
    id: number;
    content: string;
    sender_id: number;
    sender_name: string;
    created_at: Date;
}

interface ActiveChat extends RowDataPacket {
    id: number;
    name: string;
    last_message: string;
    last_message_time: Date;
    unread_count: number;
}

const router = Router();

// Simple test endpoint to check if chat routes are working
router.get('/chat/test', (req, res) => {
    console.log('Chat test endpoint called');
    res.json({ message: 'Chat routes are working!' });
});

// Add simple direct message sending endpoint for testing
router.post('/chat/direct-message', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const { content } = req.body;
        const userId = req.user.id;
        
        console.log('Direct message endpoint called by user:', userId, 'content:', content);
        
        // Get or create conversation for the user
        const [convResult] = await pool.query<ResultSetHeader>(
            `INSERT INTO conversations (user_id, status)
             VALUES (?, 'open')
             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), status = 'open'`,
            [userId]
        );
        
        const conversationId = convResult.insertId || 0;
        
        // Save message to database
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO messages (conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, NOW())',
            [conversationId, userId, content]
        );
        
        console.log('Message saved with ID:', result.insertId);
        
        res.json({ success: true, messageId: result.insertId });
    } catch (error) {
        console.error('Error saving direct message:', error);
        res.status(500).json({ success: false, message: 'Error saving message' });
    }
});

// Add a simplified test endpoint for chat history that doesn't require database access
router.get('/simple-chat-history', (req, res: Response) => {
    console.log('Simple chat history endpoint called');
    
    // Return hardcoded sample messages
    const sampleMessages = [
        {
            id: 1,
            content: "Welcome to the support chat! How can I help you today?",
            senderId: 999, // Admin ID
            senderName: "Support Agent",
            timestamp: new Date().toISOString(),
            isAdmin: true
        }
    ];
    
    res.json(sampleMessages);
});

// Add a direct message test endpoint that doesn't use database
router.post('/simple-message', (req, res: Response) => {
    const { content } = req.body;
    
    console.log('Simple message endpoint called with content:', content);
    
    // Create a mock message response
    const messageResponse = {
        id: Math.floor(Math.random() * 1000) + 100,
        content: content,
        senderId: req.body.userId || 1,
        senderName: req.body.userName || "User",
        timestamp: new Date().toISOString(),
        isAdmin: false
    };
    
    res.json({ success: true, message: messageResponse });
});

// Catch-all history endpoint to handle all possible URL paths
router.get(['/api/chat/history', '/chat/history'], authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        console.log('Chat history requested by user:', userId);
        
        // Try to get messages directly without requiring conversation
        try {
            // Simple query that doesn't depend on conversation table
            const [rows] = await pool.query<RowDataPacket[]>(`
                SELECT 
                    m.id,
                    m.content,
                    m.sender_id,
                    m.created_at,
                    m.is_admin,
                    IFNULL(CONCAT(u.first_name, ' ', u.last_name), 'Unknown User') as sender_name
                FROM messages m
                LEFT JOIN users u ON m.sender_id = u.id
                WHERE 
                    (m.conversation_id IN (SELECT id FROM conversations WHERE user_id = ?))
                    OR m.sender_id = ?
                ORDER BY m.created_at ASC
            `, [userId, userId]);
            
            if (!rows || rows.length === 0) {
                console.log('No messages found for user:', userId);
                return res.json([]);
            }
            
            console.log(`Found ${rows.length} messages for user:`, userId);
            
            return res.json(rows.map((message: RowDataPacket) => ({
                id: Number(message.id),
                content: message.content,
                senderId: Number(message.sender_id),
                senderName: message.sender_name,
                timestamp: message.created_at instanceof Date ? message.created_at.toISOString() : message.created_at,
                isAdmin: Boolean(message.is_admin) || message.sender_id !== userId
            })));
            
        } catch (error) {
            console.error('Error retrieving messages:', error);
            // Return empty array instead of error
            return res.json([]);
        }
    } catch (error) {
        console.error('Error in chat history route:', error);
        res.status(500).json({ message: 'Error fetching chat history' });
    }
});

// Admin routes
router.get('/admin/active-chats', authenticateToken, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const [activeChats] = await pool.query<ActiveChat[]>(
            `SELECT DISTINCT 
                u.id,
                CONCAT(u.first_name, ' ', u.last_name) as name,
                c.id as conversation_id,
                (SELECT content 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC 
                 LIMIT 1) as last_message,
                (SELECT created_at 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 ORDER BY created_at DESC 
                 LIMIT 1) as last_message_time,
                (SELECT COUNT(*) 
                 FROM messages 
                 WHERE conversation_id = c.id 
                 AND is_read = false 
                 AND sender_id = u.id) as unread_count
             FROM conversations c
             JOIN users u ON c.user_id = u.id
             WHERE c.status = 'open'
             ORDER BY last_message_time DESC`
        );

        res.json(activeChats.map(chat => ({
            id: chat.id,
            name: chat.name,
            lastMessage: chat.last_message,
            lastMessageTime: chat.last_message_time,
            unreadCount: chat.unread_count,
            isOnline: false // This will be updated through WebSocket
        })));
    } catch (error) {
        console.error('Error fetching active chats:', error);
        res.status(500).json({ message: 'Error fetching active chats' });
    }
});

// Get chat history for specific user (admin only)
router.get('/admin/chat-history/:userId', authenticateToken, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const [messages] = await pool.query<ChatMessage[]>(
            `SELECT m.*, 
                    CONCAT(u.first_name, ' ', u.last_name) as sender_name
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             JOIN users u ON m.sender_id = u.id
             WHERE c.user_id = ?
             ORDER BY m.created_at ASC`,
            [req.params.userId]
        );

        // Mark messages as read
        await pool.query(
            `UPDATE messages m
             JOIN conversations c ON m.conversation_id = c.id
             SET m.is_read = true
             WHERE c.user_id = ? AND m.sender_id = ?`,
            [req.params.userId, req.params.userId]
        );

        res.json(messages.map(message => ({
            id: Number(message.id),
            content: message.content,
            senderId: Number(message.sender_id),
            senderName: message.sender_name,
            timestamp: message.created_at.toISOString(),
            isAdmin: message.sender_id !== parseInt(req.params.userId)
        })));
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ message: 'Error fetching chat history' });
    }
});

// Add diagnostic route to view all conversations and messages
router.get('/chat/debug', async (req, res: Response) => {
    try {
        console.log('Debug endpoint called');
        
        // Get all conversations
        const [conversations] = await pool.query(
            `SELECT * FROM conversations`
        );
        
        // Get all messages
        const [messages] = await pool.query(
            `SELECT m.*, 
                    u.id as user_id,
                    CONCAT(u.first_name, ' ', u.last_name) as sender_name
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id`
        );
        
        // Get database tables
        const [tables] = await pool.query(
            `SHOW TABLES`
        );
        
        // Get messages table structure
        const [messageStructure] = await pool.query(
            `DESCRIBE messages`
        );
        
        // Get conversations table structure
        const [convStructure] = await pool.query(
            `DESCRIBE conversations`
        );
        
        res.json({
            tables,
            messageStructure,
            convStructure,
            conversations,
            messages,
            message: 'Debug information retrieved'
        });
    } catch (error) {
        console.error('Error retrieving debug info:', error);
        res.status(500).json({ message: 'Error retrieving debug info', error: String(error) });
    }
});

export default router; 