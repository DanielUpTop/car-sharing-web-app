const helmet = require('helmet');

const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "*", "data:", "blob:", "'unsafe-inline'", "'unsafe-eval'"],
            connectSrc: ["'self'", "*"],
            frameSrc: ["'self'", "*"],
            scriptSrc: ["'self'", "*", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "*", "'unsafe-inline'"],
            imgSrc: ["'self'", "*", "data:", "blob:"],
            fontSrc: ["'self'", "*", "data:"],
            formAction: ["'self'", "*"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null,
            workerSrc: ["'self'", "blob:", "*"],
            childSrc: ["'self'", "blob:", "*"],
            mediaSrc: ["'self'", "*"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

module.exports = securityHeaders; 