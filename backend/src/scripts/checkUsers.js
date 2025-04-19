const db = require('../config/dbConfig');

async function checkUsers() {
    try {
        // Select all users and their relevant fields
        const [users] = await db.query(`
            SELECT id, email, role, is_verified, status, 
                   LENGTH(password) as password_length 
            FROM users
        `);
        
        console.log('\nUsers in database:');
        console.log('==================');
        users.forEach(user => {
            console.log(`
Email: ${user.email}
Role: ${user.role}
Verified: ${user.is_verified ? 'Yes' : 'No'}
Status: ${user.status || 'Not set'}
Password length: ${user.password_length}
-------------------`);
        });
    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await db.end();
    }
}

checkUsers(); 