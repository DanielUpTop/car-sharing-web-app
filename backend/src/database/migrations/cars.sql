ALTER TABLE cars
ADD COLUMN price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0.00;

UPDATE cars
SET price_per_hour = daily_rate / 24;

UPDATE cars
SET 
    latitude = 51.5074,
    longitude = -0.1278
WHERE latitude IS NULL OR longitude IS NULL;

INSERT INTO cars (
    make, 
    model, 
    year, 
    registration_number, 
    daily_rate, 
    price_per_hour,
    location, 
    availability_status, 
    image_url, 
    latitude, 
    longitude, 
    address, 
    type, 
    seats, 
    rating
) VALUES 
('Nissan', 'Leaf', 2022, 'EV22DEF', 48.00, 2.00, 'London', 'available', 
'https://example.com/leaf.jpg', 51.5136, -0.1377, '221B Baker Street, London', 'electric', 5, 4.5),

('Tesla', 'Model Y', 2023, 'EV23GHI', 80.00, 3.33, 'London', 'available', 
'https://example.com/model-y.jpg', 51.5074, -0.1278, 'Oxford Street, London', 'electric', 7, 4.9),

('Toyota', 'Prius', 2022, 'HB22JKL', 45.00, 1.88, 'London', 'available', 
'https://example.com/prius.jpg', 51.5194, -0.1270, 'Kings Cross, London', 'hybrid', 5, 4.3),

('BMW', 'i3', 2023, 'EV23MNO', 65.00, 2.71, 'London', 'available', 
'https://example.com/i3.jpg', 51.5099, -0.1371, 'Regent Street, London', 'electric', 4, 4.6); 