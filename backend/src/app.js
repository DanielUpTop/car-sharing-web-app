const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();

// Import controllers needed for direct route definition
const paymentController = require('./controllers/paymentController'); 

// Import routes
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminBookingRoutes = require('./routes/adminBookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); // For non-webhook payment routes
const chatRoutes = require('./routes/chatRoutes');
const adminChatRoutes = require('./routes/adminChatRoutes');
const supportTicketsRoutes = require('./routes/supportTicketsRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const adminInsuranceRoutes = require('./routes/adminInsuranceRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const helpRoutes = require('./routes/helpRoutes');
const geocodeRoutes = require('./routes/geocodeRoutes');

const app = express();

// --- IMPORTANT: Define Stripe webhook route BEFORE global body parsers ---
// Apply raw body parser ONLY to this route
app.post('/api/payments/webhook', 
    express.raw({type: '*/*'}), // Make type completely generic
    paymentController.handleWebhook
);
// --- END Specific Webhook Route ---

// --- General Middleware (Applied AFTER specific webhook route) ---
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Your frontend URLs
    credentials: true
}));

// Standard JSON and URL-encoded body parsers for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers (consider reviewing CSP directives)
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.stripe.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://*.stripe.com"],
                frameSrc: ["'self'", "https://*.stripe.com"],
                imgSrc: ["'self'", "https://*.stripe.com", "data:", "https:"],
                connectSrc: [
                    "'self'", 
                    "https://*.stripe.com",
                    "ws://localhost:*",
                    "wss://localhost:*",
                    "http://localhost:*",
                    "https://localhost:*"
                ],
            }
        }
    })
);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Routes (Webhook is handled above) ---
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/admin/insurance', adminInsuranceRoutes);
// Mount paymentRoutes for non-webhook endpoints like /create-payment-intent
// Ensure /webhook is NOT defined again within paymentRoutes.js
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chat/admin', adminChatRoutes);
app.use('/api/support/tickets', supportTicketsRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/geocode', geocodeRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something broke!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

module.exports = app; 