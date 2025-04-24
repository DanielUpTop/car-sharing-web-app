const db = require('../config/database');
const logger = require('../utils/logger');

class Chat {
    static async createTable() {
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    subject VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'open',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await db.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            logger.info('Chat tables created successfully');
        } catch (error) {
            logger.error('Error creating chat tables:', error);
            throw error;
        }
    }

    static async createConversation(userId, subject) {
        try {
            const result = await db.query(
                `INSERT INTO conversations (user_id, subject)
                 VALUES ($1, $2)
                 RETURNING *`,
                [userId, subject]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Error creating conversation:', error);
            throw error;
        }
    }

    static async addMessage(conversationId, senderId, content) {
        try {
            const result = await db.query(
                `INSERT INTO messages (conversation_id, sender_id, content)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [conversationId, senderId, content]
            );

            // Update conversation timestamp
            await db.query(
                `UPDATE conversations 
                 SET updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [conversationId]
            );

            return result.rows[0];
        } catch (error) {
            logger.error('Error adding message:', error);
            throw error;
        }
    }

    static async getUserConversations(userId) {
        try {
            const result = await db.query(
                `SELECT c.*, 
                        (SELECT COUNT(*) FROM messages m 
                         WHERE m.conversation_id = c.id 
                         AND m.is_read = false 
                         AND m.sender_id != $1) as unread_count,
                        (SELECT m.content 
                         FROM messages m 
                         WHERE m.conversation_id = c.id 
                         ORDER BY m.created_at DESC 
                         LIMIT 1) as last_message
                 FROM conversations c
                 WHERE c.user_id = $1
                 ORDER BY c.updated_at DESC`,
                [userId]
            );
            return result.rows;
        } catch (error) {
            logger.error('Error fetching user conversations:', error);
            throw error;
        }
    }

    static async getAllConversations() {
        try {
            const result = await db.query(
                `SELECT c.*, 
                        u.email as user_email,
                        u.first_name,
                        u.last_name,
                        (SELECT COUNT(*) FROM messages m 
                         WHERE m.conversation_id = c.id 
                         AND m.is_read = false) as unread_count,
                        (SELECT m.content 
                         FROM messages m 
                         WHERE m.conversation_id = c.id 
                         ORDER BY m.created_at DESC 
                         LIMIT 1) as last_message
                 FROM conversations c
                 JOIN users u ON c.user_id = u.id
                 ORDER BY c.updated_at DESC`
            );
            return result.rows;
        } catch (error) {
            logger.error('Error fetching all conversations:', error);
            throw error;
        }
    }

    static async getConversationMessages(conversationId, userId) {
        try {
            // Mark messages as read
            await db.query(
                `UPDATE messages 
                 SET is_read = true 
                 WHERE conversation_id = $1 
                 AND sender_id != $2`,
                [conversationId, userId]
            );

            // Get messages with sender info
            const result = await db.query(
                `SELECT m.*, 
                        u.email as sender_email,
                        u.first_name as sender_first_name,
                        u.last_name as sender_last_name,
                        u.role as sender_role
                 FROM messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.conversation_id = $1
                 ORDER BY m.created_at ASC`,
                [conversationId]
            );
            return result.rows;
        } catch (error) {
            logger.error('Error fetching conversation messages:', error);
            throw error;
        }
    }

    static async closeConversation(conversationId) {
        try {
            const result = await db.query(
                `UPDATE conversations 
                 SET status = 'closed' 
                 WHERE id = $1
                 RETURNING *`,
                [conversationId]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Error closing conversation:', error);
            throw error;
        }
    }

    static async reopenConversation(conversationId) {
        try {
            const result = await db.query(
                `UPDATE conversations 
                 SET status = 'open' 
                 WHERE id = $1
                 RETURNING *`,
                [conversationId]
            );
            return result.rows[0];
        } catch (error) {
            logger.error('Error reopening conversation:', error);
            throw error;
        }
    }
}

module.exports = Chat; 