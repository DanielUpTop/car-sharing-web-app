const db = require('../config/dbConfig');

class Car {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS cars (
                id INT AUTO_INCREMENT,
                make VARCHAR(50) NOT NULL,
                model VARCHAR(50) NOT NULL,
                year INT NOT NULL,
                registration_number VARCHAR(20) UNIQUE NOT NULL,
                daily_rate DECIMAL(10,2) NOT NULL,
                location VARCHAR(100),
                availability_status ENUM('available', 'booked', 'maintenance') DEFAULT 'available',
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )
        `;
        
        try {
            await db.query(query);
            console.log('Cars table created successfully');
        } catch (error) {
            console.error('Error creating cars table:', error);
            throw error;
        }
    }

    static async findAll() {
        const query = `
            SELECT 
                id, make, model, year, registration_number,
                daily_rate, price_per_hour, location, availability_status,
                image_url, latitude, longitude, address, type, seats, rating,
                created_at, updated_at
            FROM cars
            WHERE availability_status = 'available'
        `;
        try {
            const [rows] = await db.query(query);
            return rows.map(car => ({
                ...car,
                location: [car.latitude, car.longitude], // Format for frontend
                pricePerHour: car.price_per_hour // Camel case for frontend
            }));
        } catch (error) {
            console.error('Error finding cars:', error);
            throw error;
        }
    }

    static async getAll() {
        const query = `
            SELECT 
                c.*,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(r.id) as total_ratings
            FROM cars c
            LEFT JOIN ratings r ON c.id = r.car_id
            GROUP BY c.id
        `;
        
        try {
            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Error fetching cars:', error);
            throw error;
        }
    }

    static async getById(id) {
        const query = `
            SELECT 
                c.*,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(r.id) as total_ratings
            FROM cars c
            LEFT JOIN ratings r ON c.id = r.car_id
            WHERE c.id = ?
            GROUP BY c.id
        `;
        
        try {
            const [rows] = await db.query(query, [id]);
            return rows[0];
        } catch (error) {
            console.error('Error fetching car:', error);
            throw error;
        }
    }

    static async findByLocation(lat, lng, radius) {
        try {
            const query = `
                SELECT 
                    c.*,
                    (
                        6371 * acos(
                            cos(radians(?)) * cos(radians(latitude))
                            * cos(radians(longitude) - radians(?))
                            + sin(radians(?)) * sin(radians(latitude))
                        )
                    ) AS distance
                FROM cars c
                WHERE available = true
                HAVING distance < ?
                ORDER BY distance
            `;
            
            const [cars] = await db.query(query, [lat, lng, lat, radius]);
            return cars;
        } catch (error) {
            console.error('Error finding cars by location:', error);
            throw error;
        }
    }
}

module.exports = Car; 