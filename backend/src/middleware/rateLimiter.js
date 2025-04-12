const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per window
    message: 'Too many login attempts, please try again after 15 minutes'
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: 'Too many requests, please try again later'
});

module.exports = { authLimiter, apiLimiter }; 