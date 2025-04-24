const express = require('express');
const router = express.Router();
const MembershipController = require('../controllers/membershipController');
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/isAdmin');

// Initialize tables (admin only)
router.post('/initialize', authenticateToken, isAdmin, MembershipController.initializeTables);

// Create a new membership
router.post('/', authenticateToken, MembershipController.createMembership);

// Get user's active membership
router.get('/user/:userId', authenticateToken, MembershipController.getUserMembership);

// Update membership
router.put('/:membershipId', authenticateToken, MembershipController.updateMembership);

// Cancel membership
router.delete('/:membershipId', authenticateToken, MembershipController.cancelMembership);

// Get membership benefits
router.get('/benefits/:membershipType', MembershipController.getMembershipBenefits);

// Admin route to check for expired memberships
router.get('/check-expired', authenticateToken, isAdmin, MembershipController.checkExpiredMemberships);

module.exports = router; 