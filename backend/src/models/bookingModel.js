const db = require('../config/dbConfig');

class Booking {
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                car_id INT NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                total_price DECIMAL(10,2) NOT NULL,
                payment_session_id VARCHAR(255) DEFAULT NULL,
                payment_status ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
                payment_method VARCHAR(50) DEFAULT NULL,
                payment_date TIMESTAMP NULL DEFAULT NULL,
                refund_amount DECIMAL(10,2) DEFAULT NULL,
                refund_date TIMESTAMP NULL DEFAULT NULL,
                stripe_customer_id VARCHAR(255) DEFAULT NULL,
                stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
                priority INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (car_id) REFERENCES cars(id),
                INDEX idx_booking_dates (car_id, start_date, end_date),
                INDEX idx_user_bookings (user_id, status),
                INDEX idx_payment_session (payment_session_id),
                INDEX idx_payment_status (payment_status),
                INDEX idx_payment_date (payment_date),
                INDEX idx_priority (priority)
            )
        `;
        await db.query(sql);
        
        // Create booking_discounts table for storing membership discounts
        await this.createBookingDiscountsTable();
    }
    
    static async createBookingDiscountsTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS booking_discounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                original_price DECIMAL(10,2) NOT NULL,
                discounted_price DECIMAL(10,2) NOT NULL,
                discount_percentage INT NOT NULL,
                membership_type ENUM('basic', 'premium', 'platinum') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
                INDEX idx_booking_id (booking_id)
            )
        `;
        await db.query(sql);
    }

    static async create(bookingData) {
        const query = `
            INSERT INTO bookings 
            (user_id, car_id, start_date, end_date, total_price, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        try {
            const [result] = await db.query(query, [
                bookingData.user_id,
                bookingData.car_id,
                bookingData.start_date,
                bookingData.end_date,
                bookingData.total_price,
                bookingData.status
            ]);
            return result.insertId;
        } catch (error) {
            console.error('Error creating booking:', error);
            throw error;
        }
    }

    static async getUserBookings(userId) {
        const query = `
            SELECT b.*, c.make, c.model, c.registration_number
            FROM bookings b
            JOIN cars c ON b.car_id = c.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `;

        try {
            const [rows] = await db.query(query, [userId]);
            return rows;
        } catch (error) {
            console.error('Error fetching user bookings:', error);
            throw error;
        }
    }

    static async updateStatus(bookingId, status) {
        const query = 'UPDATE bookings SET status = ? WHERE id = ?';
        try {
            const [result] = await db.query(query, [status, bookingId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating booking status:', error);
            throw error;
        }
    }

    static async findByUserId(userId) {
        try {
            const query = `
                SELECT b.*, c.make, c.model 
                FROM bookings b
                JOIN cars c ON b.car_id = c.id
                WHERE b.user_id = ?
                ORDER BY b.created_at DESC
            `;
            const [bookings] = await db.query(query, [userId]);
            return bookings;
        } catch (error) {
            console.error('Error in findByUserId:', error);
            throw error;
        }
    }
}

module.exports = Booking; 