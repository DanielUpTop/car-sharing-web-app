const bcrypt = require('bcryptjs');
const db = require('../config/dbConfig');

async function createUsers() {
    try {
        // Create admin user
        const adminPassword = '$2a$10$1hX1o6diOmI8c821cmL18.T8TVORTBQ5DhL.u0nSDyxRVQgY4Kbi.';
        await db.query(`
            INSERT INTO users (
                first_name, 
                last_name, 
                email, 
                password, 
                role, 
                status
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE password=VALUES(password)
        `, [
            'Admin',
            'User',
            'admin@carshare.com',
            adminPassword,
            'admin',
            'active'
        ]);

        // Create test user
        const testPassword = await bcrypt.hash('testpassword', 10);
        await db.query(`
            INSERT INTO users (
                first_name, 
                last_name, 
                email, 
                password, 
                role, 
                status
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE email=email
        `, [
            'Test',
            'User',
            'test@carshare.com',
            testPassword,
            'rentee',
            'active'
        ]);

        console.log('Users created successfully');
    } catch (error) {
        console.error('Error creating users:', error);
    }
}

createUsers(); 