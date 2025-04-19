const db = require('../config/dbConfig');

async function fixUsers() {
    try {
        // Update all users to be verified
        const [result] = await db.query(
            'UPDATE users SET is_verified = true, verification_token = NULL'
        );
        
        console.log(`Successfully updated ${result.affectedRows} users`);
    } catch (error) {
        console.error('Error fixing users:', error);
    } finally {
        // Close the database connection
        await db.end();
    }
}

fixUsers(); 