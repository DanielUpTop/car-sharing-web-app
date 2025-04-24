const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('Database configuration:', {
    host: '127.0.0.1',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'car_sharing_db'
});

const pool = mysql.createPool({
    host: '127.0.0.1', // Using IPv4 explicitly
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'ghana123',
    database: process.env.DB_NAME || 'car_sharing_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err.message);
        console.error('Full error:', err);
    });

module.exports = pool; 