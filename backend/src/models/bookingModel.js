const db = require('../config/dbConfig');

class Booking {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT,
                user_id INT NOT NULL,
                car_id INT NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                total_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (car_id) REFERENCES cars(id)
            )
        `;
        
        try {
            await db.query(query);
            console.log('Bookings table created successfully');
        } catch (error) {
            console.error('Error creating bookings table:', error);
            throw error;
        }
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