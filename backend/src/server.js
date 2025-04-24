const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const url = require('url');
require('dotenv').config();
const db = require('./config/dbConfig');
const User = require('./models/userModel');
const Car = require('./models/carModel');
const Booking = require('./models/bookingModel');
const Insurance = require('./models/insuranceModel');
const Help = require('./models/helpModel');
const Membership = require('./models/membershipModel');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const userRoutes = require('./routes/userRoutes');
const helpRoutes = require('./routes/helpRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminChatRoutes = require('./routes/adminChatRoutes');
const supportTicketsRoutes = require('./routes/supportTicketsRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const setupWebSocket = require('./websocket/chatHandler');

const app = express();
const server = http.createServer(app);

// <<<< REMOVE TOP LEVEL LOGGER >>>>
// app.use((req, res, next) => {
//   console.log(`[Server] Incoming Request: ${req.method} ${req.originalUrl}`);
//   next();
// });
// <<<< END LOGGER >>>>

console.log('Setting up WebSocket servers...');

// Create separate WebSocket servers for different paths
const chatWss = new WebSocket.Server({ noServer: true });
const adminChatWss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
    let pathname;
    try {
        // Use WHATWG URL API for reliable parsing
        const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
        pathname = parsedUrl.pathname;
    } catch (e) {
        console.error('Failed to parse request URL:', request.url, e);
        socket.destroy();
        return;
    }
    
    console.log('WebSocket upgrade request for path:', pathname);

    if (pathname === '/ws/chat') {
        console.log('Handling chat WebSocket upgrade');
        chatWss.handleUpgrade(request, socket, head, (ws) => {
            console.log('Chat WebSocket connection established');
            chatWss.emit('connection', ws, request);
        });
    } else if (pathname === '/ws/admin-chat') {
        console.log('Handling admin chat WebSocket upgrade');
        adminChatWss.handleUpgrade(request, socket, head, (ws) => {
            console.log('Admin chat WebSocket connection established');
            adminChatWss.emit('connection', ws, request);
        });
    } else {
        console.log('Invalid WebSocket path, destroying socket:', pathname);
        socket.destroy();
    }
});

// Set up WebSocket handlers
setupWebSocket(chatWss, adminChatWss);

// Security middleware with updated CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://js.stripe.com",
                "https://m.stripe.network",
                "https://m.stripe.com",
                "https://api.stripe.com",
                "https://hooks.stripe.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://m.stripe.network",
                "https://m.stripe.com"
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
                "'self'",
                "ws://localhost:*",
                "wss://localhost:*",
                "http://localhost:*",
                "https://localhost:*",
                "https://api.stripe.com",
                "https://js.stripe.com",
                "https://m.stripe.network",
                "https://m.stripe.com",
                "https://hooks.stripe.com"
            ],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "blob:"],
            workerSrc: ["'self'", "blob:", "https://m.stripe.network"],
            childSrc: ["'self'", "blob:", "https://m.stripe.network"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// CORS middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    // Log headers in development mode
    if (process.env.NODE_ENV === 'development') {
        console.log('Headers:', JSON.stringify(req.headers));
    }
    // Log the original request URL
    console.log('Original URL:', req.originalUrl);
    next();
});

// JSON parsing middleware
app.use(express.json());

// Initialize database tables
const initializeDatabase = async () => {
    try {
        await User.createTable();
        await Car.createTable();
        await Booking.createTable();
        await Insurance.createTable();
        await Help.createTable();
        await Membership.createTable();
        console.log('Database tables initialized successfully');
        
        // Insert sample data for chat and tickets in development mode
        if (process.env.NODE_ENV === 'development') {
            try {
                const insertSampleData = require('./database/sampleData');
                await insertSampleData();
                console.log('Sample chat and support ticket data initialized');
                
                const { insertMembershipBenefits } = require('./database/membershipData');
                await insertMembershipBenefits();
                console.log('Membership benefits initialized');
            } catch (error) {
                console.error('Error inserting sample data:', error);
            }
        }
    } catch (error) {
        console.error('Error initializing database tables:', error);
    }
};

// Initialize database when server starts
initializeDatabase();

// Debug route for tickets
app.get('/api/debug/tickets', async (req, res) => {
    try {
        const db = require('./config/database');
        const [tickets] = await db.query('SELECT * FROM support_tickets');
        console.log(`Debug: Found ${tickets.length} support tickets`);
        res.json({ count: tickets.length, tickets });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mount ALL Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/support/tickets', authenticateToken, supportTicketsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chat/admin', authenticateToken, adminChatRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/membership', membershipRoutes); // Alias to match frontend expectations

// Add a direct fallback for simple chat history without authentication
app.get('/api/simple-chat-history', (req, res) => {
    console.log('Serving fallback chat history');
    const sampleMessages = [
        {
            id: 1,
            content: "Welcome to our support chat! How can we help you today?",
            senderId: 999,
            senderName: "Support Agent",
            timestamp: new Date().toISOString(),
            isAdmin: true
        }
    ];
    res.json(sampleMessages);
});

// Debug log for routes
console.log('Routes registered:');
console.log('- /api/auth');
console.log('- /api/cars');
console.log('- /api/bookings');
console.log('- /api/insurance');
console.log('- /api/users');
console.log('- /api/help');
console.log('- /api/admin');
console.log('- /api/support/tickets');
console.log('- /api/payments');
console.log('- /api/chat');
console.log('- /api/chat/admin');
console.log('- /api/memberships');

// Basic test route
app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Basic 404 handler
app.use((req, res, next) => {
  console.log(`[Server] Reached 404 Handler for ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found by simplified server` });
});

// Basic Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 