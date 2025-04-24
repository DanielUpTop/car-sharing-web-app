// Express middleware for validating insurance-related requests
const validateInsurancePolicy = (req, res, next) => {
    const { booking_id, coverage_type, coverage_amount } = req.body;

    if (!booking_id) {
        return res.status(400).json({ message: 'Booking ID is required' });
    }

    if (!coverage_type || !['basic', 'standard', 'premium'].includes(coverage_type)) {
        return res.status(400).json({ message: 'Valid insurance type is required (basic, standard, or premium)' });
    }

    if (!coverage_amount || isNaN(coverage_amount) || coverage_amount <= 0) {
        return res.status(400).json({ message: 'Valid coverage amount is required' });
    }

    next();
};

const validateInsuranceClaim = (req, res, next) => {
    const { policy_id, incident_date, description, claim_amount } = req.body;

    if (!policy_id) {
        return res.status(400).json({ message: 'Policy ID is required' });
    }

    if (!incident_date) {
        return res.status(400).json({ message: 'Incident date is required' });
    }

    const date = new Date(incident_date);
    if (isNaN(date.getTime())) {
        return res.status(400).json({ message: 'Valid incident date is required' });
    }

    if (!description || description.trim().length < 10) {
        return res.status(400).json({ message: 'Detailed incident description is required (minimum 10 characters)' });
    }

    if (!claim_amount || isNaN(claim_amount) || claim_amount <= 0) {
        return res.status(400).json({ message: 'Valid claim amount is required' });
    }

    next();
};

module.exports = {
    validateInsurancePolicy,
    validateInsuranceClaim
}; 