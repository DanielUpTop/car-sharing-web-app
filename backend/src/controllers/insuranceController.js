const Insurance = require('../models/insuranceModel');
const logger = require('../utils/logger');
const { validateInsurancePolicy, validateInsuranceClaim } = require('../middleware/insuranceValidation');

class InsuranceController {
    static async createPolicy(req, res) {
        try {
            const validationError = validateInsurancePolicy(req.body);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }

            const policyData = {
                ...req.body,
                user_id: req.user.id
            };

            const policy = await Insurance.createPolicy(policyData);
            res.status(201).json(policy);
        } catch (error) {
            logger.error('Error creating insurance policy:', error);
            res.status(500).json({ error: 'Failed to create insurance policy' });
        }
    }

    static async getUserPolicies(req, res) {
        try {
            const policies = await Insurance.getUserPolicies(req.user.id);
            res.json(policies);
        } catch (error) {
            logger.error('Error fetching user policies:', error);
            res.status(500).json({ error: 'Failed to fetch insurance policies' });
        }
    }

    static async getActivePolicies(req, res) {
        try {
            const policies = await Insurance.getActivePolicies(req.user.id);
            res.json(policies);
        } catch (error) {
            logger.error('Error fetching active policies:', error);
            res.status(500).json({ error: 'Failed to fetch active policies' });
        }
    }

    static async createClaim(req, res) {
        try {
            const validationError = validateInsuranceClaim(req.body);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }

            // Verify policy ownership
            const policy = await Insurance.getPolicyById(req.body.policy_id);
            if (!policy || policy.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Not authorized to file claim for this policy' });
            }

            const claimData = {
                ...req.body,
                user_id: req.user.id
            };

            const claim = await Insurance.createClaim(claimData);
            res.status(201).json(claim);
        } catch (error) {
            logger.error('Error creating insurance claim:', error);
            res.status(500).json({ error: 'Failed to create insurance claim' });
        }
    }

    static async getUserClaims(req, res) {
        try {
            const claims = await Insurance.getUserClaims(req.user.id);
            res.json(claims);
        } catch (error) {
            logger.error('Error fetching user claims:', error);
            res.status(500).json({ error: 'Failed to fetch insurance claims' });
        }
    }

    static async updateClaimStatus(req, res) {
        try {
            const { claimId } = req.params;
            const { status } = req.body;

            if (!['processing', 'approved', 'rejected', 'paid'].includes(status)) {
                return res.status(400).json({ error: 'Invalid claim status' });
            }

            // Verify admin role
            if (!req.user.is_admin) {
                return res.status(403).json({ error: 'Only administrators can update claim status' });
            }

            const claim = await Insurance.updateClaimStatus(claimId, status);
            if (!claim) {
                return res.status(404).json({ error: 'Claim not found' });
            }

            res.json(claim);
        } catch (error) {
            logger.error('Error updating claim status:', error);
            res.status(500).json({ error: 'Failed to update claim status' });
        }
    }

    static async getPolicyDetails(req, res) {
        try {
            const { policyId } = req.params;
            const policy = await Insurance.getPolicyById(policyId);

            if (!policy) {
                return res.status(404).json({ error: 'Policy not found' });
            }

            // Verify ownership or admin access
            if (policy.user_id !== req.user.id && !req.user.is_admin) {
                return res.status(403).json({ error: 'Not authorized to view this policy' });
            }

            res.json(policy);
        } catch (error) {
            logger.error('Error fetching policy details:', error);
            res.status(500).json({ error: 'Failed to fetch policy details' });
        }
    }

    static async getClaimDetails(req, res) {
        try {
            const { claimId } = req.params;
            const claim = await Insurance.getClaimById(claimId);

            if (!claim) {
                return res.status(404).json({ error: 'Claim not found' });
            }

            // Verify ownership or admin access
            if (claim.user_id !== req.user.id && !req.user.is_admin) {
                return res.status(403).json({ error: 'Not authorized to view this claim' });
            }

            res.json(claim);
        } catch (error) {
            logger.error('Error fetching claim details:', error);
            res.status(500).json({ error: 'Failed to fetch claim details' });
        }
    }
}

module.exports = InsuranceController; 