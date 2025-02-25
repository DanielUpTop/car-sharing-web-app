const db = require('../config/dbConfig');

class Rating {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS ratings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                booking_id INT NOT NULL,
                car_id INT NOT NULL,
                user_id INT NOT NULL,
                rating INT NOT NULL,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id),
                FOREIGN KEY (car_id) REFERENCES cars(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;
        
        try {
            await db.query(query);
            console.log('Ratings table created successfully');
        } catch (error) {
            console.error('Error creating ratings table:', error);
            throw error;
        }
    }

    static async create(ratingData) {
        const query = `
            INSERT INTO ratings (booking_id, car_id, user_id, rating, comment)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        try {
            const [result] = await db.query(query, [
                ratingData.booking_id,
                ratingData.car_id,
                ratingData.user_id,
                ratingData.rating,
                ratingData.comment
            ]);
            return result.insertId;
        } catch (error) {
            console.error('Error creating rating:', error);
            throw error;
        }
    }

    static async getCarRatings(carId) {
        const query = `
            SELECT r.*, u.first_name, u.last_name 
            FROM ratings r
            JOIN users u ON r.user_id = u.id
            WHERE r.car_id = ?
            ORDER BY r.created_at DESC
        `;
        
        try {
            const [rows] = await db.query(query, [carId]);
            return rows;
        } catch (error) {
            console.error('Error fetching car ratings:', error);
            throw error;
        }
    }

    static async getAverageRating(carId) {
        const query = `
            SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings
            FROM ratings
            WHERE car_id = ?
        `;
        
        try {
            const [rows] = await db.query(query, [carId]);
            return {
                averageRating: rows[0].average_rating || 0,
                totalRatings: rows[0].total_ratings || 0
            };
        } catch (error) {
            console.error('Error fetching average rating:', error);
            throw error;
        }
    }
}

module.exports = Rating; 