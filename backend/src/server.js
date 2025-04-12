const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/dbConfig');
const User = require('./models/userModel');
const Car = require('./models/carModel');
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const Booking = require('./models/bookingModel');
const authenticateToken = require('./middleware/authenticateToken');
const userRoutes = require('./routes/userRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Initialize database tables
const initializeDatabase = async () => {
    try {
        await User.createTable();
        await Car.createTable();
        await Booking.createTable();
        console.log('Database initialized successfully');
        
        // Log table existence
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME IN ('bookings', 'users', 'cars')
        `, [process.env.DB_NAME]);
        
        console.log('Available tables:', tables);
        
        // Check if admin user exists
        const [adminUser] = await db.query('SELECT * FROM users WHERE role = ?', ['admin']);
        if (adminUser.length === 0) {
            console.log('No admin user found. Please run the createAdmin script.');
        } else {
            console.log('Admin user exists');
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

// Initialize database when server starts
initializeDatabase();

// Basic test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});

// Add this route near your other routes
app.get('/', (req, res) => {
    res.json({ message: 'Car Sharing API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 