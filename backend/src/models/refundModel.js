const db = require('../config/dbConfig');

class Refund {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS refunds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                reason VARCHAR(255) NOT NULL,
                status ENUM('pending', 'completed', 'failed') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
                INDEX idx_booking_id (booking_id)
            )
        `;
        
        try {
            await db.query(query);
            console.log('Refunds table created or already exists');
        } catch (error) {
            console.error('Error creating refunds table:', error);
            throw error;
        }
    }
    
    static async createRefund(bookingId, amount, reason) {
        try {
            const [result] = await db.query(
                `INSERT INTO refunds (booking_id, amount, reason, status) 
                 VALUES (?, ?, ?, ?)`,
                [bookingId, amount, reason, 'pending']
            );
            
            return result.insertId;
        } catch (error) {
            console.error('Error creating refund:', error);
            throw error;
        }
    }
    
    static async updateRefundStatus(refundId, status) {
        try {
            await db.query(
                'UPDATE refunds SET status = ? WHERE id = ?',
                [status, refundId]
            );
            
            return true;
        } catch (error) {
            console.error('Error updating refund status:', error);
            throw error;
        }
    }
    
    static async getRefundsByUser(userId) {
        try {
            const [refunds] = await db.query(
                `SELECT r.*, b.start_date, b.end_date, c.make, c.model 
                 FROM refunds r
                 JOIN bookings b ON r.booking_id = b.id
                 JOIN cars c ON b.car_id = c.id
                 WHERE b.user_id = ?
                 ORDER BY r.created_at DESC`,
                [userId]
            );
            
            return refunds;
        } catch (error) {
            console.error('Error getting refunds by user:', error);
            throw error;
        }
    }
    
    static async getRefundsByBooking(bookingId) {
        try {
            const [refunds] = await db.query(
                'SELECT * FROM refunds WHERE booking_id = ?',
                [bookingId]
            );
            
            return refunds;
        } catch (error) {
            console.error('Error getting refunds by booking:', error);
            throw error;
        }
    }
}

module.exports = Refund; 