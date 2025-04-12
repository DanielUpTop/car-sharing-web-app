const bcrypt = require('bcryptjs');
const db = require('../config/dbConfig');

async function resetAdminPassword() {
  try {
    // Hash the password using bcryptjs with 10 salt rounds
    const plainPassword = 'adminpassword';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('Generated hash:', hashedPassword);
    
    // Update admin user password
    const [result] = await db.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'admin@carshare.com']
    );
    
    if (result.affectedRows > 0) {
      console.log('Admin password updated successfully!');
    } else {
      console.log('Admin user not found. Creating admin user...');
      
      // Insert admin user if it doesn't exist
      const [insertResult] = await db.query(`
        INSERT INTO users (
          first_name, last_name, email, password, phone_number, 
          driving_license, role, status
        ) VALUES (
          'Admin', 'User', 'admin@carshare.com', ?, '07700900000',
          'ADMIN123', 'admin', 'active'
        )
      `, [hashedPassword]);
      
      if (insertResult.insertId) {
        console.log('Admin user created successfully!');
      }
    }
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

resetAdminPassword();