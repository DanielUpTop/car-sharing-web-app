const db = require('../config/dbConfig');

/**
 * Insert default membership benefits
 */
async function insertMembershipBenefits() {
    try {
        // First, check if benefits already exist to avoid duplicates
        const [existingBenefits] = await db.query(
            'SELECT COUNT(*) as count FROM membership_benefits'
        );

        if (existingBenefits[0].count > 0) {
            console.log('Membership benefits already exist, skipping insertion');
            return;
        }

        // Benefits for Basic membership
        await db.query(`
            INSERT INTO membership_benefits 
                (membership_type, name, description, discount_percentage, insurance_coverage, priority_booking, free_cancellations) 
            VALUES 
                ('basic', 'Basic Discount', 'Get 5% off on all car rentals', 5, NULL, false, NULL),
                ('basic', 'Standard Insurance', 'Basic insurance coverage for rentals', NULL, 500.00, false, NULL),
                ('basic', 'Limited Cancellations', 'One free cancellation per month', NULL, NULL, false, 1)
        `);

        // Benefits for Premium membership
        await db.query(`
            INSERT INTO membership_benefits 
                (membership_type, name, description, discount_percentage, insurance_coverage, priority_booking, free_cancellations) 
            VALUES 
                ('premium', 'Premium Discount', 'Get 10% off on all car rentals', 10, NULL, false, NULL),
                ('premium', 'Enhanced Insurance', 'Enhanced insurance coverage with lower deductible', NULL, 1000.00, false, NULL),
                ('premium', 'Priority Booking', 'Get priority when booking popular cars', NULL, NULL, true, NULL),
                ('premium', 'Multiple Cancellations', 'Three free cancellations per month', NULL, NULL, false, 3),
                ('premium', '24/7 Support', 'Access to 24/7 premium customer support', NULL, NULL, false, NULL)
        `);

        // Benefits for Platinum membership
        await db.query(`
            INSERT INTO membership_benefits 
                (membership_type, name, description, discount_percentage, insurance_coverage, priority_booking, free_cancellations) 
            VALUES 
                ('platinum', 'Platinum Discount', 'Get 15% off on all car rentals', 15, NULL, false, NULL),
                ('platinum', 'Premium Insurance', 'Comprehensive insurance with minimal deductible', NULL, 2000.00, false, NULL),
                ('platinum', 'VIP Priority', 'Highest priority for booking all car types', NULL, NULL, true, NULL),
                ('platinum', 'Unlimited Cancellations', 'Unlimited free cancellations', NULL, NULL, false, 999),
                ('platinum', 'Dedicated Support', 'Personal dedicated customer support agent', NULL, NULL, false, NULL),
                ('platinum', 'Free Upgrades', 'Free car upgrades when available', NULL, NULL, false, NULL)
        `);

        console.log('Membership benefits inserted successfully');
    } catch (error) {
        console.error('Error inserting membership benefits:', error);
    }
}

module.exports = { insertMembershipBenefits }; 