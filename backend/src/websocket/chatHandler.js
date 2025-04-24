const jwt = require('jsonwebtoken');
const db = require('../config/dbConfig');

// Initialize chat tables if they don't exist
const initChatTables = async () => {
    try {
        // Create conversations table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subject VARCHAR(255) DEFAULT NULL,
                status ENUM('open', 'closed') DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (user_id)
            )
        `);

        // Create messages table if it doesn't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NULL,
                sender_id INT NOT NULL,
                content TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                is_read BOOLEAN DEFAULT FALSE,
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (conversation_id),
                INDEX (sender_id)
            )
        `);

        // Check for existing messages without conversation_id and fix them
        await db.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = DATABASE()
                AND table_name = 'messages'
                AND column_name = 'conversation_id'
            ) as column_exists
        `).then(async ([result]) => {
            if (result[0].column_exists) {
                console.log('Checking for messages without conversation_id...');
                const [messages] = await db.query('SELECT * FROM messages WHERE conversation_id IS NULL');
                if (messages.length > 0) {
                    console.log(`Found ${messages.length} messages without conversation_id. Fixing...`);
                    for (const message of messages) {
                        // Get or create conversation for the sender
                        const [convResult] = await db.query(
                            `INSERT INTO conversations (user_id, status)
                             VALUES (?, 'open')
                             ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), status = 'open'`,
                            [message.sender_id]
                        );
                        const conversationId = convResult.insertId;
                        
                        // Update the message with the conversation_id
                        await db.query(
                            'UPDATE messages SET conversation_id = ? WHERE id = ?',
                            [conversationId, message.id]
                        );
                    }
                }
            }
        });

        console.log('Chat tables initialized');
    } catch (error) {
        console.error('Error initializing chat tables:', error);
    }
};

// Initialize tables on server start
initChatTables();

const clients = new Map();
const adminClients = new Set();

const setupWebSocket = (chatWss, adminWss) => {
    // Handle regular chat connections
    chatWss.on('connection', (ws, req) => {
        const connectionId = Math.random().toString(36).substring(7);
        console.log(`[${connectionId}] New chat client connection attempt`);
        let userId = null;

        ws.on('message', async (message) => {
            try {
                console.log(`[${connectionId}] Received message:`, message.toString());
                const data = JSON.parse(message.toString());

                if (data.type === 'auth') {
                    // Authenticate user
                    const token = data.token;
                    if (!token) {
                        console.error(`[${connectionId}] Authentication failed: No token provided.`);
                        ws.close(1008, 'No token provided');
                        return;
                    }
                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        if (!decoded || typeof decoded !== 'object' || !decoded.id) {
                            console.error(`[${connectionId}] Authentication failed: Invalid token payload. Decoded:`, decoded);
                            ws.close(1008, 'Invalid token');
                            return;
                        }
                        userId = decoded.id;
                        clients.set(userId, ws);
                        console.log(`[${connectionId}] Chat client authenticated: User ${userId}`);

                        ws.userId = userId;

                        ws.send(JSON.stringify({ type: 'auth_success' }));
                    } catch (error) {
                        console.error(`[${connectionId}] Authentication failed: Token verification error for token ${token ? token.substring(0, 10) + '...' : 'N/A'}. Error:`, error.message);
                        ws.close(1008, 'Authentication failed');
                    }
                } else if (data.type === 'message' && userId) {
                    console.log(`[${connectionId}] Processing message from authenticated user ${userId}`);
                    // Handle new message
                    try {
                        console.log('Received message from user:', userId, 'content:', data.message.content);
                        
                        // Use the conversation ID sent from client if available
                        let conversationId = data.conversationId;
                        
                        if (!conversationId) {
                            // Get existing conversation for the user
                            const [existingConvs] = await db.query(
                                'SELECT id FROM conversations WHERE user_id = ? AND status = "open" ORDER BY updated_at DESC LIMIT 1',
                                [userId]
                            );
                            
                            if (existingConvs.length > 0) {
                                // Use the most recent open conversation
                                conversationId = existingConvs[0].id;
                                console.log('Using existing conversation ID:', conversationId);
                            } else {
                                // Create a new conversation if none exists
                                const [convResult] = await db.query(
                                    'INSERT INTO conversations (user_id, status, subject) VALUES (?, "open", ?)',
                                    [userId, "Support Chat"]
                                );
                                conversationId = convResult.insertId;
                                console.log('Created new conversation ID:', conversationId);
                            }
                        }
                        
                        if (!conversationId) {
                            console.error('Failed to get or create conversation ID');
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Failed to process message'
                            }));
                            return;
                        }
                        
                        // Update conversation's updated_at timestamp to mark as active
                        await db.query(
                            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [conversationId]
                        );
                        
                        console.log('Using conversation ID:', conversationId);
                        
                        // Save message to database with conversation_id
                        const [result] = await db.query(
                            'INSERT INTO messages (conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, NOW())',
                            [conversationId, userId, data.message.content]
                        );

                        console.log('Message saved with ID:', result.insertId);

                        // Get message details
                        const [messages] = await db.query(
                            `SELECT m.*, 
                                    CONCAT(u.first_name, ' ', u.last_name) as sender_name
                             FROM messages m
                             JOIN users u ON m.sender_id = u.id
                             WHERE m.id = ?`,
                            [result.insertId]
                        );

                        const messageToSend = {
                            id: messages[0].id,
                            content: messages[0].content,
                            senderId: messages[0].sender_id,
                            senderName: messages[0].sender_name,
                            timestamp: messages[0].created_at,
                            isAdmin: false
                        };

                        console.log('Sending message to client:', messageToSend);

                        // Send to all admin clients
                        adminClients.forEach(adminWs => {
                            if (adminWs.readyState === 1) {
                                adminWs.send(JSON.stringify({
                                    type: 'message',
                                    message: messageToSend
                                }));
                            }
                        });

                        // Send confirmation back to sender
                        ws.send(JSON.stringify({
                            type: 'message',
                            message: messageToSend
                        }));
                    } catch (error) {
                        console.error('Error handling message:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Failed to process message'
                        }));
                    }
                } else if (!userId) {
                    console.warn(`[${connectionId}] Received message of type ${data.type || 'unknown'} before authentication. Closing connection.`);
                    ws.close(1008, 'Not authenticated');
                }
            } catch (error) {
                console.error(`[${connectionId}] WebSocket error processing message. User: ${ws.userId || userId || 'unauthenticated'}. Error:`, error);
                if (error instanceof SyntaxError) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format received.' }));
                }
            }
        });

        ws.on('close', (code, reason) => {
            const reasonStr = reason ? reason.toString() : 'No reason provided';
            console.log(`[${connectionId}] Chat client disconnected: User ${ws.userId || userId || 'unknown'}. Code: ${code}, Reason: ${reasonStr}`);
            if (ws.userId) {
                clients.delete(ws.userId);
                adminClients.forEach(adminWs => {
                    if (adminWs.readyState === 1) {
                        adminWs.send(JSON.stringify({
                            type: 'user_status',
                            userId: ws.userId,
                            isOnline: false
                        }));
                    }
                });
            } else if (userId) {
                clients.delete(userId);
                adminClients.forEach(adminWs => {
                    if (adminWs.readyState === 1) {
                        adminWs.send(JSON.stringify({
                            type: 'user_status',
                            userId: userId,
                            isOnline: false
                        }));
                    }
                });
            }
        });

        ws.on('error', (error) => {
            console.error(`[${connectionId}] WebSocket connection error for user ${ws.userId || userId || 'unknown'}. Error:`, error);
            if (ws.userId) {
                clients.delete(ws.userId);
            } else if (userId) {
                clients.delete(userId);
            }
        });
    });

    // Handle admin chat connections
    adminWss.on('connection', (ws, req) => {
        console.log('New admin client connected');
        let adminId = null;

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'auth') {
                    // Authenticate admin
                    const token = data.token;
                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        const [rows] = await db.query(
                            'SELECT id, role FROM users WHERE id = ?',
                            [decoded.id]
                        );

                        if (rows[0]?.role === 'admin') {
                            adminId = decoded.id;
                            adminClients.add(ws);
                            console.log('Admin client authenticated:', adminId);
                            
                            // Send initial connection success message
                            ws.send(JSON.stringify({ type: 'auth_success' }));
                        } else {
                            ws.close();
                        }
                    } catch (error) {
                        console.error('Admin authentication failed:', error);
                        ws.close();
                    }
                } else if (data.type === 'admin_message') {
                    const { userId, content, conversationId } = data.message;
                    const isSystemMessage = data.message.is_system || false;
                    
                    if (!userId || !conversationId) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'User ID and Conversation ID are required for admin messages'
                        }));
                        return;
                    }

                    try {
                        // First check if the conversation exists and belongs to the user
                        const [conversationRows] = await db.query(
                            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
                            [conversationId, userId]
                        );
                        
                        if (conversationRows.length === 0) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'Conversation not found or does not belong to the user'
                            }));
                            return;
                        }
                        
                        // Save message to the database
                        const [result] = await db.query(
                            'INSERT INTO messages (conversation_id, sender_id, content, is_admin, is_system) VALUES (?, ?, ?, TRUE, ?)',
                            [conversationId, adminId, content, isSystemMessage]
                        );
                        
                        const messageId = result.insertId;

                        // Get message details
                        const [messageRows] = await db.query(
                            `SELECT m.*, 
                                    CONCAT(u.first_name, ' ', u.last_name) as sender_name
                             FROM messages m
                             JOIN users u ON m.sender_id = u.id
                             WHERE m.id = ?`,
                            [messageId]
                        );

                        if (messageRows.length > 0) {
                            const message = {
                                id: messageRows[0].id,
                                content: messageRows[0].content,
                                senderId: messageRows[0].sender_id,
                                senderName: messageRows[0].sender_name,
                                timestamp: messageRows[0].created_at,
                                isAdmin: true,
                                is_system: messageRows[0].is_system || false,
                                conversationId: messageRows[0].conversation_id
                        };

                            // Send to target user if they're connected
                            const targetClient = clients.get(parseInt(userId));
                            if (targetClient && targetClient.readyState === 1) {
                                targetClient.send(JSON.stringify({
                                    type: 'message',
                                    message
                                }));
                            }
                            
                            // Send to all OTHER admin clients for synchronization
                            // This prevents the message from being duplicated for the sender
                            adminClients.forEach(adminClient => {
                                if (adminClient !== ws && adminClient.readyState === 1) {
                                    adminClient.send(JSON.stringify({
                                type: 'message',
                                        message
                                    }));
                                }
                            });
                            
                            // Send confirmation back to the admin who sent it
                            ws.send(JSON.stringify({
                                type: 'message_sent',
                                message
                            }));
                        }
                    } catch (error) {
                        console.error('Error handling admin message:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'Failed to process admin message: ' + error.message
                        }));
                    }
                } else if (data.type === 'close_conversation') {
                    const { conversationId } = data;
                    
                    if (!conversationId) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'Conversation ID is required to close a conversation'
                        }));
                        return;
                    }
                    
                    try {
                        // Update conversation status to closed
                        await db.query(
                            'UPDATE conversations SET status = "closed" WHERE id = ?',
                            [conversationId]
                        );
                        
                        // Get the user ID for this conversation
                        const [convRows] = await db.query(
                            'SELECT user_id FROM conversations WHERE id = ?',
                            [conversationId]
                        );
                        
                        if (convRows.length === 0) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'Conversation not found'
                            }));
                            return;
                        }
                        
                        const userId = convRows[0].user_id;
                        
                        // Send rating request message
                        const [result] = await db.query(
                            'INSERT INTO messages (conversation_id, sender_id, content, is_admin, is_system) VALUES (?, ?, ?, TRUE, TRUE)',
                            [conversationId, adminId, "Thank you for chatting with us. Please rate your experience from 1-10 stars."]
                        );
                        
                        // Notify all admin clients that the conversation is closed
                        adminClients.forEach(adminClient => {
                            if (adminClient.readyState === 1) {
                                adminClient.send(JSON.stringify({
                                    type: 'conversation_closed',
                                    conversationId
                                }));
                            }
                        });
                        
                        // Notify the user if they're connected
                        const userClient = clients.get(parseInt(userId));
                        if (userClient && userClient.readyState === 1) {
                            // Get the rating message
                            const [msgRows] = await db.query(
                                `SELECT m.*, 
                                    CONCAT(u.first_name, ' ', u.last_name) as sender_name
                                 FROM messages m
                                 JOIN users u ON m.sender_id = u.id
                                 WHERE m.id = ?`,
                                [result.insertId]
                            );
                            
                            if (msgRows.length > 0) {
                                const ratingMessage = {
                                    id: msgRows[0].id,
                                    content: msgRows[0].content,
                                    senderId: msgRows[0].sender_id,
                                    senderName: msgRows[0].sender_name,
                                    timestamp: msgRows[0].created_at,
                                    isAdmin: true,
                                    is_system: true,
                                    conversationId
                                };
                                
                                userClient.send(JSON.stringify({
                                    type: 'message',
                                    message: ratingMessage
                                }));
                                
                                // Also send a conversation_closed event
                                userClient.send(JSON.stringify({
                                    type: 'conversation_closed',
                                    conversationId
                                }));
                            }
                        }
                        
                        ws.send(JSON.stringify({
                            type: 'conversation_closed',
                            conversationId
                        }));
                        
                    } catch (error) {
                        console.error('Error closing conversation:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: 'Failed to close conversation: ' + error.message
                        }));
                    }
                }
            } catch (error) {
                console.error('Admin WebSocket error:', error);
            }
        });

        ws.on('close', () => {
            if (adminId) {
                adminClients.delete(ws);
                console.log('Admin client disconnected:', adminId);
            }
        });
    });
};

module.exports = setupWebSocket; 