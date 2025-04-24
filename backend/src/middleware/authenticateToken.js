const jwt = require('jsonwebtoken');
const db = require('../config/dbConfig');
const { JWT_SECRET } = require('../config/jwtConfig');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        console.log(`[AUTH] Endpoint: ${req.method} ${req.originalUrl}`);
        console.log(`[AUTH] Auth header present: ${!!authHeader}`);
        console.log(`[AUTH] Token present: ${!!token}`);

        if (!token) {
            console.log('[AUTH] Access token is required');
            return res.status(401).json({ message: 'Access token is required' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('[AUTH] Token decoded successfully:', decoded);
            
            // Verify user exists and is active
            const [users] = await db.query(
                'SELECT id, email, role, status, is_verified FROM users WHERE id = ?',
                [decoded.id]
            );

            console.log(`[AUTH] User found: ${users.length > 0}`);
            
            if (!users.length) {
                console.log(`[AUTH] User not found for id: ${decoded.id}`);
                return res.status(401).json({ message: 'User not found' });
            }

            const user = users[0];
            console.log(`[AUTH] User details: id=${user.id}, role=${user.role}, status=${user.status}`);

            // Check if user is active
            if (user.status !== 'active') {
                console.log(`[AUTH] User account is not active: ${user.status}`);
                return res.status(403).json({ message: 'User account is not active' });
            }

            // Check if email is verified (skip for admin users)
            if (!user.is_verified && user.role !== 'admin') {
                console.log(`[AUTH] Email not verified for user: ${user.email}`);
                return res.status(403).json({ 
                    message: 'Email not verified',
                    needsVerification: true
                });
            }

            console.log(`[AUTH] Authentication successful for: ${user.email} (${user.role})`);
            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                isAdmin: user.role === 'admin'  // Add explicit isAdmin flag
            };

            next();
        } catch (jwtError) {
            console.error('[AUTH] JWT verification error:', jwtError);
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token has expired' });
            }
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('[AUTH] Token verification error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired' });
        }
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authenticateToken; 