import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ChatClient {
    ws: WebSocket;
    userId: number;
    isAdmin: boolean;
}

interface Message {
    id: number;
    content: string;
    senderId: number;
    senderName: string;
    timestamp: string;
    isAdmin: boolean;
}

interface User extends RowDataPacket {
    id: number;
    role: string;
}

class ChatHandler {
    private clients: Map<number, ChatClient> = new Map();
    private adminClients: Set<WebSocket> = new Set();

    constructor() {
        setInterval(() => this.cleanupConnections(), 30000); // Cleanup every 30 seconds
    }

    handleConnection(ws: WebSocket, path: string) {
        console.log('New WebSocket connection:', path);

        ws.on('message', async (message: string) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'auth') {
                    await this.handleAuth(ws, data.token, path);
                } else if (data.type === 'message') {
                    await this.handleMessage(ws, data.message);
                } else if (data.type === 'admin_message') {
                    await this.handleAdminMessage(ws, data.message);
                }
            } catch (error) {
                console.error('Error handling message:', error);
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            }
        });

        ws.on('close', () => {
            this.handleDisconnection(ws);
        });
    }

    private async handleAuth(ws: WebSocket, token: string, path: string) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secure-jwt-secret-key') as jwt.JwtPayload;
            const [rows] = await pool.query<User[]>(
                'SELECT id, role FROM users WHERE id = ?',
                [decoded.userId]
            );
            const user = rows[0];

            if (!user) {
                ws.close();
                return;
            }

            const isAdmin = user.role === 'admin';
            if (path === '/ws/admin-chat' && !isAdmin) {
                ws.close();
                return;
            }

            if (path === '/ws/admin-chat') {
                this.adminClients.add(ws);
            } else {
                this.clients.set(user.id, { ws, userId: user.id, isAdmin });
                this.broadcastUserStatus(user.id, true);
            }

            ws.send(JSON.stringify({ type: 'auth_success' }));
        } catch (error) {
            console.error('Auth error:', error);
            ws.close();
        }
    }

    private async handleMessage(ws: WebSocket, messageData: any) {
        const client = Array.from(this.clients.values()).find(c => c.ws === ws);
        if (!client) return;

        try {
            // Create or get conversation
            const [result] = await pool.query<ResultSetHeader>(
                `INSERT INTO conversations (user_id, status) 
                 VALUES (?, 'open')
                 ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), status = 'open'`,
                [client.userId]
            );
            const conversationId = result.insertId;

            // Save message
            const [messageResult] = await pool.query<ResultSetHeader>(
                `INSERT INTO messages (conversation_id, sender_id, content, created_at) 
                 VALUES (?, ?, ?, ?)`,
                [conversationId, client.userId, messageData.content, new Date()]
            );

            // Get the saved message with user details
            const [savedMessage] = await pool.query<RowDataPacket[]>(
                `SELECT m.*, 
                        CONCAT(u.first_name, ' ', u.last_name) as sender_name
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.id = ?`,
                [messageResult.insertId]
            );

            const message: Message = {
                id: savedMessage[0].id,
                content: savedMessage[0].content,
                senderId: savedMessage[0].sender_id,
                senderName: savedMessage[0].sender_name,
                timestamp: savedMessage[0].created_at.toISOString(),
                isAdmin: false
            };

            // Send to all admin clients
            this.adminClients.forEach(adminWs => {
                if (adminWs.readyState === WebSocket.OPEN) {
                    adminWs.send(JSON.stringify({ type: 'message', message }));
                }
            });

            // Send back to sender for confirmation
            ws.send(JSON.stringify({ type: 'message', message }));
        } catch (error) {
            console.error('Error saving message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to save message' }));
        }
    }

    private async handleAdminMessage(ws: WebSocket, messageData: any) {
        if (!this.adminClients.has(ws)) return;

        try {
            // Get conversation
            const [rows] = await pool.query<RowDataPacket[]>(
                'SELECT id FROM conversations WHERE user_id = ? AND status = "open"',
                [messageData.userId]
            );
            
            if (rows.length === 0) {
                throw new Error('No active conversation found');
            }

            const conversationId = rows[0].id;

            // Save message
            const [messageResult] = await pool.query<ResultSetHeader>(
                `INSERT INTO messages (conversation_id, sender_id, content, created_at, is_read) 
                 VALUES (?, ?, ?, ?, false)`,
                [conversationId, messageData.userId, messageData.content, new Date()]
            );

            // Get the saved message with user details
            const [savedMessage] = await pool.query<RowDataPacket[]>(
                `SELECT m.*, 
                        CONCAT(u.first_name, ' ', u.last_name) as sender_name
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.id = ?`,
                [messageResult.insertId]
            );

            const message: Message = {
                id: savedMessage[0].id,
                content: savedMessage[0].content,
                senderId: savedMessage[0].sender_id,
                senderName: savedMessage[0].sender_name,
                timestamp: savedMessage[0].created_at.toISOString(),
                isAdmin: true
            };

            // Send to target user
            const targetClient = this.clients.get(messageData.userId);
            if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
                targetClient.ws.send(JSON.stringify({ type: 'message', message }));
            }

            // Send to all admin clients for sync
            this.adminClients.forEach(adminWs => {
                if (adminWs.readyState === WebSocket.OPEN) {
                    adminWs.send(JSON.stringify({ type: 'message', message }));
                }
            });
        } catch (error) {
            console.error('Error saving admin message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to save message' }));
        }
    }

    private handleDisconnection(ws: WebSocket) {
        // Handle user disconnection
        const client = Array.from(this.clients.values()).find(c => c.ws === ws);
        if (client) {
            this.clients.delete(client.userId);
            this.broadcastUserStatus(client.userId, false);
        }

        // Handle admin disconnection
        this.adminClients.delete(ws);
    }

    private broadcastUserStatus(userId: number, isOnline: boolean) {
        this.adminClients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'user_status',
                    userId,
                    isOnline
                }));
            }
        });
    }

    private cleanupConnections() {
        // Clean up user connections
        for (const [userId, client] of this.clients.entries()) {
            if (client.ws.readyState !== WebSocket.OPEN) {
                this.clients.delete(userId);
                this.broadcastUserStatus(userId, false);
            }
        }

        // Clean up admin connections
        for (const ws of this.adminClients) {
            if (ws.readyState !== WebSocket.OPEN) {
                this.adminClients.delete(ws);
            }
        }
    }
}

export const chatHandler = new ChatHandler(); 