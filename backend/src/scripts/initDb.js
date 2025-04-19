const db = require('../config/dbConfig');

async function initializeDatabase() {
    try {
        // Drop existing tables in the correct order (from child to parent)
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('DROP TABLE IF EXISTS ratings');
        await db.query('DROP TABLE IF EXISTS bookings');
        await db.query('DROP TABLE IF EXISTS users');
        await db.query('DROP TABLE IF EXISTS cars');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        // Create users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone_number VARCHAR(15),
                driving_license VARCHAR(50),
                role ENUM('admin', 'rentee') DEFAULT 'rentee',
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create cars table
        await db.query(`
            CREATE TABLE IF NOT EXISTS cars (
                id INT PRIMARY KEY AUTO_INCREMENT,
                make VARCHAR(50) NOT NULL,
                model VARCHAR(50) NOT NULL,
                type VARCHAR(50) NOT NULL,
                price_per_hour DECIMAL(10,2),
                daily_rate DECIMAL(10,2),
                image VARCHAR(255),
                availability_status ENUM('available', 'booked', 'maintenance') DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create bookings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                car_id INT NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (car_id) REFERENCES cars(id)
            )
        `);

        // Create ratings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS ratings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                car_id INT NOT NULL,
                booking_id INT NOT NULL,
                rating INT NOT NULL,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (car_id) REFERENCES cars(id),
                FOREIGN KEY (booking_id) REFERENCES bookings(id)
            )
        `);

        console.log('Database initialized successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase(); 