USE car_sharing_db;

-- Add payment-related columns to bookings table
ALTER TABLE bookings
ADD COLUMN payment_session_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
ADD COLUMN payment_method VARCHAR(50) DEFAULT NULL,
ADD COLUMN payment_date TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN refund_date TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
ADD INDEX idx_payment_session (payment_session_id),
ADD INDEX idx_payment_status (payment_status),
ADD INDEX idx_payment_date (payment_date);

-- Update existing bookings to have default payment status
UPDATE bookings SET payment_status = 'pending' WHERE payment_status IS NULL;

-- Add payment history table
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

-- Add refunds table
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

-- Verify the changes
DESCRIBE bookings;
DESCRIBE payment_history;
DESCRIBE refunds; 