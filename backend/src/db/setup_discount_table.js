const fs = require('fs');
const path = require('path');
const db = require('../config/dbConfig');

async function setupDiscountTable() {
    try {
        console.log('Setting up booking_discounts table...');
        
        // Read SQL file
        const sqlFilePath = path.join(__dirname, 'booking_discounts_table.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Execute the SQL statement
        await db.query(sql);
        
        console.log('Booking discounts table created successfully!');
    } catch (error) {
        console.error('Error setting up booking_discounts table:', error);
    } finally {
        process.exit();
    }
}

setupDiscountTable(); 