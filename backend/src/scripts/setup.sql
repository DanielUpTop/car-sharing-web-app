USE car_sharing_db;

SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in correct order (due to foreign key constraints)
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS payment_history;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS cars;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- Create tables
CREATE TABLE users (
    id INT AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    driving_license VARCHAR(50),
    role ENUM('rentee','admin') DEFAULT 'rentee',
    status ENUM('active', 'blocked') DEFAULT 'active',
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    profile_image_url VARCHAR(255),
    date_of_birth DATE,
    address VARCHAR(255),
    city VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100),
    preferred_payment_method VARCHAR(50),
    notification_preferences JSON,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    driving_license_expiry DATE,
    driving_license_country VARCHAR(100),
    language_preference VARCHAR(50) DEFAULT 'en',
    theme_preference VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

CREATE TABLE cars (
    id INT AUTO_INCREMENT,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    location VARCHAR(100),
    availability_status ENUM('available', 'booked', 'maintenance') DEFAULT 'available',
    image_url VARCHAR(255),
    latitude DECIMAL(10, 8) NOT NULL DEFAULT 51.5074,
    longitude DECIMAL(11, 8) NOT NULL DEFAULT -0.1278,
    address VARCHAR(255),
    type ENUM('electric', 'hybrid', 'petrol') NOT NULL DEFAULT 'petrol',
    seats INT NOT NULL DEFAULT 5,
    rating DECIMAL(2,1) DEFAULT 0.0,
    price_per_hour DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_availability (availability_status),
    INDEX idx_location (latitude, longitude),
    INDEX idx_type (type)
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (car_id) REFERENCES cars(id),
    INDEX idx_booking_dates (car_id, start_date, end_date),
    INDEX idx_user_bookings (user_id, status),
    INDEX idx_payment_session (payment_session_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_payment_date (payment_date)
);

CREATE TABLE payment_history (
    id INT AUTO_INCREMENT,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    payment_method VARCHAR(50) NOT NULL,
    status ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded') NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    INDEX idx_booking_payments (booking_id),
    INDEX idx_payment_status (status),
    INDEX idx_stripe_session (stripe_session_id)
);

CREATE TABLE refunds (
    id INT AUTO_INCREMENT,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    stripe_refund_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    INDEX idx_booking_refunds (booking_id),
    INDEX idx_refund_status (status)
);

CREATE TABLE ratings (
    id INT AUTO_INCREMENT,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    booking_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
    INDEX idx_rating_car (car_id)
);

-- Delete existing users
DELETE FROM users WHERE email IN ('test@example.com', 'admin@carshare.com');

-- Add test user (password: testpassword)
INSERT INTO users (
    first_name, 
    last_name, 
    email, 
    password, 
    phone_number, 
    driving_license, 
    role, 
    status,
    is_verified
) VALUES (
    'Test',
    'User',
    'test@example.com',
    '$2b$10$dVwS3bZgAHjDkOQUZb1GRu0.UFH3KfqRWA2r1zEY5SUAAUPg8rsNi',
    '1234567890',
    'DL123456',
    'rentee',
    'active',
    true
);

-- Add admin user (password: adminpassword)
INSERT INTO users (
    first_name,
    last_name,
    email,
    password,
    phone_number,
    driving_license,
    role,
    status,
    is_verified
) VALUES (
    'Admin',
    'User',
    'admin@carshare.com',
    '$2a$10$GHaoVhCVLv0bPQHj3K4ExeVD7RRMgL/Mx0kF9WbPapd4RYtwEu5u.',
    '07700900000',
    'ADMIN123',
    'admin',
    'active',
    true
);

-- Add sample cars
INSERT INTO cars (
    make, model, year, registration_number, daily_rate, price_per_hour,
    location, availability_status, image_url, latitude, longitude, 
    address, type, seats, rating
) VALUES 
('Nissan', 'Leaf', 2022, 'EV22DEF', 48.00, 2.00, 'London', 'available', 
'https://example.com/leaf.jpg', 51.5136, -0.1377, '221B Baker Street, Marylebone, London NW1 6XE', 'electric', 5, 4.5),

('Tesla', 'Model Y', 2023, 'EV23GHI', 80.00, 3.33, 'London', 'available', 
'https://example.com/model-y.jpg', 51.5074, -0.1278, '388 Oxford Street, London W1C 1JT', 'electric', 7, 4.9),

('Toyota', 'Prius', 2022, 'HB22JKL', 45.00, 1.88, 'London', 'available', 
'https://example.com/prius.jpg', 51.5194, -0.1270, 'Kings Cross Station, Euston Road, London N1C 4TB', 'hybrid', 5, 4.3);

SET SQL_SAFE_UPDATES = 1; 