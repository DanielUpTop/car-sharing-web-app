const bcrypt = require('bcryptjs');
const db = require('../config/dbConfig');

async function createAdminUser() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Check if admin already exists
        const [existingAdmin] = await db.query(
            'SELECT * FROM users WHERE email = ?', 
            ['admin@carshare.com']
        );

        if (existingAdmin.length > 0) {
            console.log('Admin user already exists');
            return;
        }

        // Create admin user
        await db.query(`
            INSERT INTO users (
                first_name,
                last_name,
                email,
                password,
                role,
                status
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'Admin',
            'User',
            'admin@carshare.com',
            hashedPassword,
            'admin',
            'active'
        ]);

        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

createAdminUser(); 