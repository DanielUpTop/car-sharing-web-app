require('dotenv').config({ path: 'backend/.env' });
const mysql = require('mysql2/promise');
const Car = require('../models/carModel');

async function setupDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });

    try {
        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log('Database created or already exists');

        // Use the database
        await connection.query(`USE ${process.env.DB_NAME}`);
        console.log('Using database:', process.env.DB_NAME);

        // Create tables
        await Car.createTable();
        console.log('Tables created successfully');

        console.log('Database setup completed successfully');
    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        await connection.end();
    }
}

// Run the setup
setupDatabase().catch(console.error); 