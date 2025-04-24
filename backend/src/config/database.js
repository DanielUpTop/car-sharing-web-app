const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a more robust pool configuration
const poolConfig = {
    host: '127.0.0.1',  // Changed from 'localhost' to '127.0.0.1' to avoid IPv6 issues
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_sharing_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Force IPv4 
    connectTimeout: 10000, // 10 seconds
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000 // 10 seconds
};

// Log the connection configuration (without sensitive data)
console.log('Database configuration:', { 
    host: poolConfig.host, 
    user: poolConfig.user, 
    database: poolConfig.database 
});

// Create the connection pool
const pool = mysql.createPool(poolConfig);

// Test the connection and provide useful error messages
pool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Failed to connect to the database:', err.message);
        
        if (err.code === 'ECONNREFUSED') {
            console.error(`
==================== DATABASE CONNECTION ERROR ====================
Could not connect to MySQL at ${poolConfig.host}:3306.
Please make sure:
1. Your MySQL server is running
2. Your MySQL credentials are correct
3. You're using the correct host (127.0.0.1 instead of localhost)
4. The port 3306 is accessible
==================================================================
`);
        }
    });

// Create a simple wrapper for database operations with fallback behavior
const db = {
    query: async (...args) => {
        try {
            return await pool.query(...args);
        } catch (error) {
            console.error(`Database query error: ${error.message}`);
            // If connection fails, throw a more descriptive error
            if (error.code === 'ECONNREFUSED') {
                throw new Error(`Database connection refused. Make sure MySQL is running.`);
            }
            throw error;
        }
    }
};

module.exports = db; 