-- Create help_categories table
CREATE TABLE IF NOT EXISTS help_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    `order` INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create help_articles table
CREATE TABLE IF NOT EXISTS help_articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    `order` INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES help_categories(id) ON DELETE CASCADE
);

-- Insert some default categories
INSERT INTO help_categories (name, description, `order`) VALUES 
('Getting Started', 'Basic information for new users', 1),
('Bookings', 'How to book a car and manage your bookings', 2),
('Payments', 'Payment methods and billing information', 3),
('Insurance', 'Insurance coverage and claims process', 4),
('Account Management', 'Managing your account settings and profile', 5);

-- Insert some sample articles
INSERT INTO help_articles (category_id, title, content, `order`, is_published) VALUES
(1, 'How to create an account', '<h2>Creating Your Account</h2><p>Follow these steps to create an account on our car sharing platform:</p><ol><li>Click on the "Sign Up" button on the homepage</li><li>Enter your email address and create a password</li><li>Provide your personal details and upload your driving license</li><li>Verify your email address by clicking the link in the verification email</li><li>Complete your profile by adding a payment method</li></ol><p>Once your account is verified, you can start booking cars immediately!</p>', 1, TRUE),
(1, 'Verifying your driver\'s license', '<h2>Driver\'s License Verification</h2><p>For safety and security, we require all users to verify their driving license before booking a car. Here\'s how:</p><ol><li>Go to your account settings</li><li>Click on "Verify License"</li><li>Upload clear images of the front and back of your license</li><li>Provide your license number and expiration date</li><li>Submit for verification</li></ol><p>Our team typically verifies licenses within 24 hours. You\'ll receive an email notification once your license is verified.</p>', 2, TRUE),
(2, 'How to book a car', '<h2>Booking a Car</h2><p>Booking a car with our service is quick and easy:</p><ol><li>Browse available cars on the map or list view</li><li>Select a car and your desired booking period</li><li>Review the booking details and total cost</li><li>Confirm and pay for your booking</li></ol><p>After booking, you\'ll receive a confirmation email with all the details including how to locate and unlock the car.</p>', 1, TRUE),
(2, 'Extending or canceling a booking', '<h2>Managing Your Bookings</h2><p>Need to make changes to your booking? Here\'s how:</p><h3>Extending Your Booking</h3><p>To extend your booking:</p><ol><li>Go to "My Bookings" in your dashboard</li><li>Select the booking you want to extend</li><li>Click "Extend Booking" and select your new end time</li><li>Confirm the extension</li></ol><h3>Canceling Your Booking</h3><p>To cancel your booking:</p><ol><li>Go to "My Bookings" in your dashboard</li><li>Select the booking you want to cancel</li><li>Click "Cancel Booking"</li><li>Confirm the cancellation</li></ol><p>Please note our cancellation policy: Full refund if canceled 24+ hours before start time, 50% refund if canceled 12-24 hours before, no refund if canceled less than 12 hours before.</p>', 2, TRUE),
(3, 'Payment methods', '<h2>Payment Methods</h2><p>We accept the following payment methods:</p><ul><li>Credit and debit cards (Visa, Mastercard, American Express)</li><li>PayPal</li><li>Apple Pay</li><li>Google Pay</li></ul><p>To add a new payment method:</p><ol><li>Go to "Account" > "Payment Methods"</li><li>Click "Add Payment Method"</li><li>Select your preferred payment type</li><li>Enter the required details</li><li>Set as default if desired</li></ol>', 1, TRUE),
(4, 'Understanding your insurance coverage', '<h2>Insurance Coverage</h2><p>All bookings include comprehensive insurance coverage. Here\'s what\'s included:</p><ul><li><strong>Collision Damage Waiver (CDW)</strong>: Covers damage to the rental car</li><li><strong>Third-Party Liability</strong>: Covers damage to other vehicles and property</li><li><strong>Personal Accident Insurance</strong>: Covers injuries to driver and passengers</li><li><strong>Theft Protection</strong>: Covers theft of the vehicle</li></ul><p>The standard excess/deductible is £500, which can be reduced to £100 or £0 by purchasing optional excess reduction.</p>', 1, TRUE),
(5, 'Updating your profile', '<h2>Updating Your Profile</h2><p>Keeping your profile information up-to-date is important for a smooth experience:</p><ol><li>Go to "Account" > "Profile"</li><li>Click "Edit" next to the section you want to update</li><li>Make your changes</li><li>Click "Save"</li></ol><p>Remember to keep your contact information and payment details current to avoid any issues with your bookings.</p>', 1, TRUE); 