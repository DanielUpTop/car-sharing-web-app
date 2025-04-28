USE car_sharing_db;

-- Check if the required_membership column exists and add it if not
SELECT COUNT(*) INTO @col_exists
FROM information_schema.columns 
WHERE table_schema = DATABASE()
AND table_name = 'cars' 
AND column_name = 'required_membership';

SET @alter_statement = IF(@col_exists = 0,
    'ALTER TABLE cars ADD COLUMN required_membership ENUM("none", "basic", "premium", "platinum") DEFAULT "basic" AFTER price_per_hour',
    'SELECT "Column already exists" AS message');

PREPARE stmt FROM @alter_statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update cars based on their price points
-- Basic cars (most affordable)
UPDATE cars 
SET required_membership = 'basic' 
WHERE daily_rate <= 250;

-- Premium cars (mid-range luxury)
UPDATE cars 
SET required_membership = 'premium' 
WHERE daily_rate > 250 AND daily_rate <= 500;

-- Platinum cars (high-end luxury)
UPDATE cars 
SET required_membership = 'platinum' 
WHERE daily_rate > 500;

-- Show the updated car membership requirements
SELECT id, make, model, daily_rate, required_membership 
FROM cars 
ORDER BY daily_rate DESC; 