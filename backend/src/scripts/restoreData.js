const db = require('../config/dbConfig');

async function restoreData() {
    try {
        // First, let's create the tables with the EXACT original structure
        await db.query(`
            CREATE TABLE IF NOT EXISTS cars (
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
            )
        `);

        // Your original car data
        const carsData = [
            {
                make: 'BMW',
                model: '3 Series',
                year: 2022,
                registration_number: 'BM22 3SR',
                daily_rate: 150.00,
                price_per_hour: 25.00,
                type: 'Luxury',
                location: 'London',
                address: '123 Kensington High Street, London',
                latitude: 51.5007,
                longitude: -0.1926,
                availability_status: 'available',
                image_url: '/car-images/bmw-3.jpg'
            },
            {
                make: 'Tesla',
                model: 'Model Y',
                year: 2023,
                registration_number: 'TS23 MDY',
                daily_rate: 200.00,
                price_per_hour: 35.00,
                type: 'Electric',
                location: 'London',
                address: '45 Baker Street, London',
                latitude: 51.5206,
                longitude: -0.1577,
                availability_status: 'available',
                image_url: '/car-images/tesla-y.jpg'
            },
            {
                make: 'Mercedes',
                model: 'E-Class',
                year: 2022,
                registration_number: 'ME22 ECL',
                daily_rate: 180.00,
                price_per_hour: 30.00,
                type: 'Luxury',
                location: 'London',
                address: '78 Oxford Street, London',
                latitude: 51.5152,
                longitude: -0.1414,
                availability_status: 'available',
                image_url: '/car-images/merc-e.jpg'
            },
            {
                make: 'Audi',
                model: 'Q5',
                year: 2023,
                registration_number: 'AU23 Q5X',
                daily_rate: 170.00,
                price_per_hour: 28.00,
                type: 'SUV',
                location: 'London',
                address: '90 Piccadilly, London',
                latitude: 51.5095,
                longitude: -0.1367,
                availability_status: 'available',
                image_url: '/car-images/audi-q5.jpg'
            },
            {
                make: 'Range Rover',
                model: 'Sport',
                year: 2022,
                registration_number: 'RR22 SPT',
                daily_rate: 220.00,
                price_per_hour: 40.00,
                type: 'SUV',
                location: 'London',
                address: '156 Sloane Street, London',
                latitude: 51.4962,
                longitude: -0.1594,
                availability_status: 'available',
                image_url: '/car-images/range-sport.jpg'
            }
        ];

        // Insert cars with the EXACT original structure
        for (const car of carsData) {
            const query = `
                INSERT INTO cars (
                    make, model, year, registration_number, daily_rate, 
                    price_per_hour, type, location, address, latitude, 
                    longitude, availability_status, image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    make = VALUES(make),
                    model = VALUES(model),
                    year = VALUES(year),
                    daily_rate = VALUES(daily_rate),
                    price_per_hour = VALUES(price_per_hour),
                    type = VALUES(type),
                    location = VALUES(location),
                    address = VALUES(address),
                    latitude = VALUES(latitude),
                    longitude = VALUES(longitude),
                    availability_status = VALUES(availability_status),
                    image_url = VALUES(image_url)
            `;

            await db.query(query, [
                car.make, car.model, car.year, car.registration_number,
                car.daily_rate, car.price_per_hour, car.type, car.location,
                car.address, car.latitude, car.longitude,
                car.availability_status, car.image_url
            ]);
        }

        // Create users table with the EXACT original structure
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

        // Create bookings table with the EXACT original structure
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

        // Create ratings table with the EXACT original structure
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

        // Create payments table with the EXACT original structure
        await db.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id VARCHAR(36) PRIMARY KEY,
                booking_id INT NOT NULL,
                payment_intent_id VARCHAR(255) NOT NULL,
                amount INT NOT NULL,
                status ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);

        // Create admin user with original credentials
        const adminPassword = await require('bcryptjs').hash('admin123', 10);
        const adminQuery = `
            INSERT INTO users (
                first_name, last_name, email, password, 
                role, is_verified, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                first_name = VALUES(first_name),
                last_name = VALUES(last_name),
                role = VALUES(role),
                is_verified = VALUES(is_verified),
                status = VALUES(status)
        `;

        await db.query(adminQuery, [
            'Admin',
            'User',
            'admin@carsharing.com',
            adminPassword,
            'admin',
            true,
            'active'
        ]);

        console.log('Data restored successfully with EXACT original structure');
        process.exit(0);
    } catch (error) {
        console.error('Error restoring data:', error);
        process.exit(1);
    }
}

restoreData(); 