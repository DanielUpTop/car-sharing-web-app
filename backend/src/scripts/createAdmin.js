const bcrypt = require('bcryptjs');
const db = require('../config/dbConfig');

async function createAdmin() {
    try {
        // Admin user details
        const adminUser = {
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@carshare.com',
            password: 'adminpassword', // This will be hashed
            phone_number: '0000000000',
            driving_license: 'ADMIN123',
            role: 'admin',
            status: 'active',
            is_verified: true
        };

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminUser.password, salt);

        // Check if admin already exists
        const [existingAdmin] = await db.query('SELECT * FROM users WHERE email = ?', [adminUser.email]);
        
        if (existingAdmin.length > 0) {
            console.log('Admin user already exists');
            return;
        }

        // Insert admin user
        const [result] = await db.query(`
            INSERT INTO users (
                first_name, last_name, email, password, 
                phone_number, driving_license, role, 
                status, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            adminUser.first_name,
            adminUser.last_name,
            adminUser.email,
            hashedPassword,
            adminUser.phone_number,
            adminUser.driving_license,
            adminUser.role,
            adminUser.status,
            adminUser.is_verified
        ]);

        console.log('Admin user created successfully');
        
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await db.end();
    }
}

createAdmin(); 