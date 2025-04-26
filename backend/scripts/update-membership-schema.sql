-- Update membership schema to support non-members
USE car_sharing_db;

-- Modify the memberships table to include 'none' type
ALTER TABLE memberships MODIFY COLUMN type ENUM('none', 'basic', 'premium', 'platinum') NOT NULL DEFAULT 'none';

-- Modify the membership_benefits table to include 'none' type
ALTER TABLE membership_benefits MODIFY COLUMN membership_type ENUM('none', 'basic', 'premium', 'platinum') NOT NULL;

-- Add non-member benefits to membership_benefits table
INSERT INTO membership_benefits 
  (membership_type, name, description, discount_percentage, insurance_coverage, priority_booking, free_cancellations) 
VALUES 
  ('none', 'Standard Access', 'Basic access to car sharing platform', 0, 0.00, false, 0),
  ('none', 'Standard Support', 'Regular customer support', NULL, NULL, false, NULL),
  ('none', 'Standard Booking', 'Regular booking priority', NULL, NULL, false, NULL),
  ('none', 'No Discounts', 'No additional discounts on rentals', 0, NULL, false, NULL);

-- Update the membership model's createTable function in code to match this new schema 