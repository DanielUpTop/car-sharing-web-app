const db = require('../config/dbConfig');

class Notification {
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                link VARCHAR(255),
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            )
        `;
        await db.query(sql);
    }

    static async create({ user_id, type, title, message, link = null }) {
        const [result] = await db.query(
            'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
            [user_id, type, title, message, link]
        );
        return result.insertId;
    }

    static async getUserNotifications(userId, limit = 10) {
        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [userId, limit]
        );
        return notifications;
    }

    static async getUnreadCount(userId) {
        const [[result]] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
            [userId]
        );
        return result.count;
    }

    static async markAsRead(notificationId, userId) {
        await db.query(
            'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
    }

    static async markAllAsRead(userId) {
        await db.query(
            'UPDATE notifications SET is_read = true WHERE user_id = ?',
            [userId]
        );
    }

    static async deleteNotification(notificationId, userId) {
        await db.query(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
    }
}

module.exports = Notification; 