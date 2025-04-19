const db = require('../config/dbConfig');

class Car {
    static async createTable() {
        const queries = [
            // Create table if not exists
            `CREATE TABLE IF NOT EXISTS cars (
                id INT AUTO_INCREMENT,
                make VARCHAR(50) NOT NULL,
                model VARCHAR(50) NOT NULL,
                year INT NOT NULL,
                registration_number VARCHAR(20) UNIQUE NOT NULL,
                daily_rate DECIMAL(10,2) NOT NULL,
                price_per_hour DECIMAL(10,2) NOT NULL,
                type VARCHAR(50) NOT NULL,
                location VARCHAR(100),
                address VARCHAR(255),
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                availability_status ENUM('available', 'booked', 'maintenance') DEFAULT 'available',
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            )`,
            // Check if address column exists
            `SELECT COUNT(*) as count
             FROM information_schema.columns 
             WHERE table_schema = DATABASE()
             AND table_name = 'cars' 
             AND column_name = 'address'`,
            // Add address column if it doesn't exist (this will be conditionally executed)
            `ALTER TABLE cars ADD COLUMN address VARCHAR(255) AFTER location`
        ];
        
        try {
            // Create table
            await db.query(queries[0]);
            console.log('Cars table created or verified');

            // Check if address column exists
            const [rows] = await db.query(queries[1]);
            const addressColumnExists = rows[0].count > 0;

            // Add address column if it doesn't exist
            if (!addressColumnExists) {
                await db.query(queries[2]);
                console.log('Address column added to cars table');
            } else {
                console.log('Address column already exists');
            }

            console.log('Cars table setup completed successfully');
        } catch (error) {
            console.error('Error setting up cars table:', error);
            throw error;
        }
    }

    static async findAll() {
        const query = `
            SELECT 
                c.*,
                c.address,
                c.location,
                c.latitude,
                c.longitude,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(r.id) as total_ratings
            FROM cars c
            LEFT JOIN ratings r ON c.id = r.car_id
            WHERE c.availability_status = 'available'
            GROUP BY c.id
        `;
        try {
            const [rows] = await db.query(query);
            console.log('Raw database results:', rows); // Debug log

            const processedCars = rows.map(car => {
                console.log(`Processing car ${car.make} ${car.model}:`, {
                    id: car.id,
                    make: car.make,
                    model: car.model,
                    address: car.address,
                    location: car.location
                });
                
                return {
                    ...car,
                    pricePerHour: car.price_per_hour,
                    address: car.address || car.location
                };
            });

            console.log('Processed cars:', processedCars); // Debug log
            return processedCars;
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