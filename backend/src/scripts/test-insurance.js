const db = require('../config/dbConfig');

async function testInsuranceEndpoints() {
    try {
        // Check if we have any policies in the database
        const [policies] = await db.query('SELECT * FROM insurance_policies LIMIT 10');
        console.log('Existing policies:', policies);
        
        // Insert a test policy if none exist
        if (policies.length === 0) {
            // First, check if we have any bookings
            const [bookings] = await db.query('SELECT id FROM bookings LIMIT 1');
            
            if (bookings.length === 0) {
                console.log('No bookings found. Please create a booking first.');
                return;
            }
            
            const bookingId = bookings[0].id;
            console.log(`Using booking ID: ${bookingId} for test policy`);
            
            // Insert test policy
            const [result] = await db.query(
                `INSERT INTO insurance_policies (booking_id, coverage_type, coverage_amount) 
                 VALUES (?, ?, ?)`,
                [bookingId, 'premium', 1000]
            );
            
            console.log('Test policy created with ID:', result.insertId);
            
            // Insert test claim
            const [claimResult] = await db.query(
                `INSERT INTO insurance_claims (policy_id, incident_date, description, claim_amount) 
                 VALUES (?, ?, ?, ?)`,
                [result.insertId, new Date(), 'Test claim for development', 500]
            );
            
            console.log('Test claim created with ID:', claimResult.insertId);
        }
        
        // Get all policies again to confirm
        const [updatedPolicies] = await db.query('SELECT * FROM insurance_policies');
        console.log('Updated policies:', updatedPolicies);
        
        // Get all claims
        const [claims] = await db.query('SELECT * FROM insurance_claims');
        console.log('Claims:', claims);
        
    } catch (error) {
        console.error('Error testing insurance endpoints:', error);
    } finally {
        process.exit(0);
    }
}

testInsuranceEndpoints(); 