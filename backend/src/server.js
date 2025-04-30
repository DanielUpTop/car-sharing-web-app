const http = require('http');
const url = require('url');
const WebSocket = require('ws');
require('dotenv').config();
const db = require('./config/dbConfig');
const User = require('./models/userModel');
const Car = require('./models/carModel');
const Booking = require('./models/bookingModel');
const Insurance = require('./models/insuranceModel');
const Help = require('./models/helpModel');
const Membership = require('./models/membershipModel');
const Cancellation = require('./models/cancellationModel');
const setupWebSocket = require('./websocket/chatHandler');

// Import the configured app from app.js INSTEAD of creating a new one
const app = require('./app'); 

// const app = express(); // REMOVE THIS LINE
const server = http.createServer(app); // Use the imported app

// Keep WebSocket setup as it relies on the http server instance
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

// Initialize database tables (Keep this here or move to app.js, consistency is key)
const initializeDatabase = async () => {
    try {
        await User.createTable();
        await Car.createTable();
        await Booking.createTable();
        await Insurance.createTable();
        await Help.createTable();
        await Membership.createTable();
        await Cancellation.createTable();
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

// --- Server Listening --- (Keep this part)
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => { // Use server.listen for http server (needed for WebSockets)
    console.log(`Server is running on port ${PORT}`);
});

// Optional: Export the server if needed elsewhere, otherwise remove
// module.exports = server; 