export const validateCarForm = (values: any) => {
    const errors: { [key: string]: string } = {};

    // Required fields
    const requiredFields = ['make', 'model', 'registration_number', 'daily_rate', 'price_per_hour'];
    requiredFields.forEach(field => {
        if (!values[field]) {
            errors[field] = 'This field is required';
        }
    });

    // Year validation
    const currentYear = new Date().getFullYear();
    if (values.year) {
        if (values.year < 1900 || values.year > currentYear + 1) {
            errors.year = `Year must be between 1900 and ${currentYear + 1}`;
        }
    }

    // Price validation
    if (values.daily_rate && values.daily_rate <= 0) {
        errors.daily_rate = 'Daily rate must be greater than 0';
    }
    if (values.price_per_hour && values.price_per_hour <= 0) {
        errors.price_per_hour = 'Hourly rate must be greater than 0';
    }

    // Registration number format
    if (values.registration_number && !/^[A-Z0-9]{2,8}$/.test(values.registration_number)) {
        errors.registration_number = 'Invalid registration number format';
    }

    return errors;
}; 