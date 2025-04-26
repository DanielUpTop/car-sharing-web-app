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

const validateInsuranceClaim = (data) => {
    console.log('Validating claim data:', data);
    
    // Check for required fields
    if (!data.policy_id) {
        console.log('Validation failed: Missing policy_id');
        return 'Policy ID is required';
    }

    if (!data.incident_date) {
        console.log('Validation failed: Missing incident_date');
        return 'Incident date is required';
    }

    // Parse and validate the date
    const date = new Date(data.incident_date);
    if (isNaN(date.getTime())) {
        console.log('Validation failed: Invalid incident_date format');
        return 'Valid incident date is required';
    }

    if (!data.description || data.description.trim().length < 10) {
        console.log('Validation failed: Description too short or missing');
        return 'Detailed incident description is required (minimum 10 characters)';
    }

    const claimAmount = Number(data.claim_amount);
    if (!data.claim_amount || isNaN(claimAmount) || claimAmount <= 0) {
        console.log('Validation failed: Invalid claim_amount');
        return 'Valid claim amount is required';
    }

    console.log('Validation passed for claim data');
    return null;
};

module.exports = {
    validateInsurancePolicy,
    validateInsuranceClaim
}; 