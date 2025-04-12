const { body, validationResult } = require('express-validator');

const validateUser = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateBooking = (req, res, next) => {
    const { car_id, start_date, total_price } = req.body;

    if (!car_id || !start_date || !total_price) {
        return res.status(400).json({
            message: 'Missing required fields',
            error: 'All fields are required'
        });
    }

    next();
};

module.exports = { validateUser, validateBooking }; 