/**
 * This script checks for expired memberships and converts cancelled ones to non-member type.
 * It should be run regularly via a cron job, for example:
 * 0 0 * * * node /path/to/backend/src/scripts/checkExpiredMemberships.js
 * (This would run it daily at midnight)
 */

require('dotenv').config();
const Membership = require('../models/membershipModel');

async function checkExpiredMemberships() {
    try {
        console.log('Starting expired memberships check...');
        
        // This method now converts cancelled and expired memberships to non-member
        const expiredMemberships = await Membership.checkAndUpdateExpiredMemberships();
        
        console.log(`Processed ${expiredMemberships.length} expired memberships`);
        console.log('Expired memberships check completed successfully');
    } catch (error) {
        console.error('Error checking expired memberships:', error);
    } finally {
        // Exit process when done
        process.exit(0);
    }
}

// Run the function if this script is executed directly
if (require.main === module) {
    checkExpiredMemberships();
} 