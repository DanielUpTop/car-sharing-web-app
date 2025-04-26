const express = require('express');
const router = express.Router();
const MembershipController = require('../controllers/membershipController');
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/isAdmin');
const db = require('../config/dbConfig');

// Initialize tables (admin only)
router.post('/initialize', authenticateToken, isAdmin, MembershipController.initializeTables);

// Create a new membership
router.post('/', authenticateToken, MembershipController.createMembership);

// Get user's active membership
router.get('/user/:userId', authenticateToken, MembershipController.getUserMembership);

// Get current authenticated user's membership
router.get('/', authenticateToken, MembershipController.getCurrentUserMembership);

// Upgrade membership for current user
router.post('/upgrade', authenticateToken, MembershipController.upgradeMembership);

// Update membership
router.put('/:membershipId', authenticateToken, MembershipController.updateMembership);

// Update auto-renew status for a specific membership
router.put('/:membershipId/autorenew', authenticateToken, MembershipController.updateAutoRenewStatus);

// Cancel membership
router.delete('/:membershipId', authenticateToken, MembershipController.cancelMembership);

// Get membership benefits
router.get('/benefits/:membershipType', MembershipController.getMembershipBenefits);

// Admin route to check for expired memberships
router.get('/check-expired', authenticateToken, isAdmin, MembershipController.checkExpiredMemberships);

// Admin routes
// Get all memberships (admin only)
router.get('/admin/all', authenticateToken, isAdmin, MembershipController.getAllMemberships);

// Update membership by ID (admin only)
router.put('/admin/update/:id', authenticateToken, isAdmin, MembershipController.updateMembershipById);

// Create membership for a user (admin only)
router.post('/admin/create', authenticateToken, isAdmin, MembershipController.createMembershipForUser);

// Delete membership (admin only)
router.delete('/admin/delete/:id', authenticateToken, isAdmin, MembershipController.deleteMembership);

// Get membership tiers available to users
router.get('/membership-tiers', authenticateToken, async (req, res) => {
    try {
        // Get only active tiers
        const [tiers] = await db.query(`
            SELECT * FROM membership_tiers
            WHERE is_active = TRUE
            ORDER BY price ASC
        `);
        
        // Transform benefits from JSON string to array
        const formattedTiers = tiers.map(tier => ({
            ...tier,
            benefits: JSON.parse(tier.benefits)
        }));
        
        res.json(formattedTiers);
    } catch (error) {
        console.error('Error fetching membership tiers:', error);
        res.status(500).json({ message: 'Error fetching membership tiers' });
    }
});

module.exports = router; 