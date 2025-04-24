const db = require('../config/dbConfig');

class Payment {
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS payments (
                id VARCHAR(36) PRIMARY KEY,
                booking_id INT NOT NULL,
                payment_intent_id VARCHAR(255) NOT NULL,
                amount INT NOT NULL,
                status ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
            )
        `;

        try {
            await db.query(sql);
            console.log('Payments table created successfully');
        } catch (error) {
            console.error('Error creating payments table:', error);
            throw error;
        }
    }

    static async create(paymentData) {
        const sql = `
            INSERT INTO payments (id, booking_id, payment_intent_id, amount, status)
            VALUES (UUID(), ?, ?, ?, ?)
        `;

        try {
            const [result] = await db.query(sql, [
                paymentData.booking_id,
                paymentData.payment_intent_id,
                paymentData.amount,
                paymentData.status
            ]);
            return result;
        } catch (error) {
            console.error('Error creating payment record:', error);
            throw error;
        }
    }

    static async updateStatus(paymentIntentId, status) {
        const sql = `
            UPDATE payments
            SET status = ?
            WHERE payment_intent_id = ?
        `;

        try {
            const [result] = await db.query(sql, [status, paymentIntentId]);
            return result;
        } catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    }

    static async getByUserId(userId) {
        const sql = `
            SELECT p.*, b.user_id, c.make, c.model
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN cars c ON b.car_id = c.id
            WHERE b.user_id = ?
            ORDER BY p.created_at DESC
        `;

        try {
            const [payments] = await db.query(sql, [userId]);
            return payments;
        } catch (error) {
            console.error('Error fetching user payments:', error);
            throw error;
        }
    }
}

module.exports = Payment; 