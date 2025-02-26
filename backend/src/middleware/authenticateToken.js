const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ message: 'Invalid token' });
        }

        // Log the decoded token data
        console.log('Decoded token:', user);

        // Make sure we have a user ID
        if (!user.id) {
            return res.status(401).json({ message: 'Invalid token: no user ID' });
        }

        req.user = user;
        next();
    });
};

module.exports = authenticateToken; 