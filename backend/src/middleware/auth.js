const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const logger = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            logger.warn('No token provided');
            return res.status(401).json({ message: 'Access token is required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded); // Debug log
        } catch (error) {
            logger.error('JWT verification failed:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token has expired' });
            }
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Verify user exists and is active
        const [users] = await pool.query(
            'SELECT id, email, role, status FROM users WHERE id = ?',
            [decoded.id]
        );

        if (!users.length) {
            logger.warn(`User not found for ID: ${decoded.id}`);
            return res.status(401).json({ message: 'User not found' });
        }

        const user = users[0];
        if (user.status !== 'active') {
            logger.warn(`Inactive user attempted access: ${user.id}`);
            return res.status(403).json({ message: 'User account is not active' });
        }

        // Add user info to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        logger.info(`Authenticated user: ${user.id}`);
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
};

const authorizeAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin') {
        logger.warn(`Non-admin user attempted admin action: ${req.user.id}`);
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

module.exports = {
    authenticateToken,
    authorizeAdmin
}; 