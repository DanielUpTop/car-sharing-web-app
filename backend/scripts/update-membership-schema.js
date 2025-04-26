const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDatabase() {
  try {
    console.log('Connecting to the database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'car_sharing_db'
    });
    
    console.log('Modifying memberships table to support non-member type...');
    
    // Modify the memberships table ENUM type to include 'none'
    await connection.execute("ALTER TABLE memberships MODIFY COLUMN type ENUM('none', 'basic', 'premium', 'platinum') NOT NULL DEFAULT 'none';");
    
    // Add non-member benefits to membership_benefits table
    await connection.execute(`
      INSERT INTO membership_benefits 
        (membership_type, name, description, discount_percentage, insurance_coverage, priority_booking, free_cancellations) 
      VALUES 
        ('none', 'Standard Access', 'Basic access to car sharing platform', 0, 0.00, false, 0)
      ON DUPLICATE KEY UPDATE 
        description = VALUES(description);
    `);
    
    console.log('Database schema updated successfully!');
    
    connection.end();
  } catch (error) {
    console.error('Error updating database:', error);
  }
}

updateDatabase(); 