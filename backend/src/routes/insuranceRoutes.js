const express = require('express');
const router = express.Router();
const Insurance = require('../models/insuranceModel');
const authenticateToken = require('../middleware/authenticateToken');
const { validateInsurancePolicy, validateInsuranceClaim } = require('../middleware/validationMiddleware');

// Debug logging middleware
router.use((req, res, next) => {
    console.log(`Insurance route accessed: ${req.method} ${req.path}`);
    console.log('User:', req.user);
    next();
});

// Get user's insurance policies
router.get('/policies', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching policies for user:', req.user.id);
        const policies = await Insurance.getUserPolicies(req.user.id);
        console.log('Policies found:', policies);
        res.json(policies);
    } catch (error) {
        console.error('Error fetching insurance policies:', error);
        res.status(500).json({ message: 'Error fetching insurance policies' });
    }
});

// Get active policy for a booking
router.get('/policies/active/:bookingId', authenticateToken, async (req, res) => {
    try {
        const policy = await Insurance.getActivePolicy(req.user.id, req.params.bookingId);
        if (!policy) {
            return res.status(404).json({ message: 'No active policy found for this booking' });
        }
        res.json(policy);
    } catch (error) {
        console.error('Error fetching active policy:', error);
        res.status(500).json({ message: 'Error fetching active policy' });
    }
});

// Create new insurance policy
router.post('/policies', authenticateToken, validateInsurancePolicy, async (req, res) => {
    try {
        const policyData = {
            ...req.body,
            user_id: req.user.id
        };
        const policy = await Insurance.createPolicy(policyData);
        res.status(201).json(policy);
    } catch (error) {
        console.error('Error creating insurance policy:', error);
        res.status(500).json({ message: 'Error creating insurance policy' });
    }
});

// Get user's insurance claims
router.get('/claims', authenticateToken, async (req, res) => {
    try {
        const claims = await Insurance.getUserClaims(req.user.id);
        res.json(claims);
    } catch (error) {
        console.error('Error fetching insurance claims:', error);
        res.status(500).json({ message: 'Error fetching insurance claims' });
    }
});

// Create new insurance claim
router.post('/claims', authenticateToken, async (req, res) => {
    try {
        console.log('Received claim data:', req.body);

        // Validate the request data
        const validationResult = validateInsuranceClaim(req.body);
        if (validationResult) {
            console.error('Validation error:', validationResult);
            return res.status(400).json({ message: validationResult });
        }

        // Additional debug logging for troubleshooting
        console.log('Validation passed, proceeding with claim submission');
        
        // Verify policy ownership
        const policy = await Insurance.getPolicyById(req.body.policy_id);
        if (!policy) {
            console.error('Policy not found:', req.body.policy_id);
            return res.status(404).json({ message: 'Policy not found' });
        }
        
        console.log('Found policy:', policy.id, 'User ID:', policy.user_id, 'Requester ID:', req.user.id);
        
        if (policy.user_id !== req.user.id) {
            console.error('User not authorized to file claim. Policy user:', policy.user_id, 'Requester:', req.user.id);
            return res.status(403).json({ message: 'Not authorized to file claim for this policy' });
        }

        // Check if the policy is active
        if (policy.status !== 'active') {
            console.error('Policy not active, status:', policy.status);
            return res.status(400).json({ message: 'Can only file claims for active policies' });
        }

        console.log('Creating claim for policy:', policy.id);
        const claim = await Insurance.createClaim(req.body);
        console.log('Created claim successfully:', claim);
        res.status(201).json(claim);
    } catch (error) {
        console.error('Error creating insurance claim:', error);
        res.status(500).json({ message: 'Error creating insurance claim', error: error.message });
    }
});

// Update claim status (admin only)
router.put('/claims/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status, adjusterNotes } = req.body;
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Unauthorized: Admin access required' });
        }
        await Insurance.updateClaimStatus(
            req.params.id,
            status,
            adjusterNotes,
            req.user.email
        );
        res.json({ message: 'Claim status updated successfully' });
    } catch (error) {
        console.error('Error updating claim status:', error);
        res.status(500).json({ message: 'Error updating claim status' });
    }
});

module.exports = router; 