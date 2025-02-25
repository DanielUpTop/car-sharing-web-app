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

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database tables
const initializeDatabase = async () => {
    try {
        await User.createTable();
        await Car.createTable();
        await Booking.createTable();
        console.log('Database initialized successfully');
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
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ratings', ratingRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 