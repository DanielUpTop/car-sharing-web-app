const validateInsurancePolicy = (data) => {
    const { booking_id, coverage_type, coverage_amount } = data;

    if (!booking_id) {
        return 'Booking ID is required';
    }

    if (!coverage_type || !['basic', 'standard', 'premium'].includes(coverage_type)) {
        return 'Valid coverage type is required (basic, standard, or premium)';
    }

    if (!coverage_amount || isNaN(coverage_amount) || coverage_amount <= 0) {
        return 'Valid coverage amount is required';
    }

    return null;
};

const validateInsuranceClaim = (data) => {
    const { policy_id, incident_date, description, claim_amount } = data;

    if (!policy_id) {
        return 'Policy ID is required';
    }

    if (!incident_date || isNaN(new Date(incident_date).getTime())) {
        return 'Valid incident date is required';
    }

    if (!description || description.trim().length < 10) {
        return 'Description must be at least 10 characters long';
    }

    if (!claim_amount || isNaN(claim_amount) || claim_amount <= 0) {
        return 'Valid claim amount is required';
    }

    return null;
};

module.exports = {
    validateInsurancePolicy,
    validateInsuranceClaim
}; 