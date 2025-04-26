const Membership = require('../models/membershipModel');
const db = require('../config/dbConfig');

/**
 * Controller for handling membership-related operations
 */
class MembershipController {
  /**
   * Create membership tables if they don't exist
   */
  static async initializeTables(req, res) {
    try {
      await Membership.createTable();
      return res.status(200).json({ message: 'Membership tables initialized successfully' });
    } catch (error) {
      console.error('Error initializing membership tables:', error);
      return res.status(500).json({ error: 'Failed to initialize membership tables' });
    }
  }

  /**
   * Create a new membership for a user
   */
  static async createMembership(req, res) {
    try {
      const { userId, membershipType, startDate, endDate, paymentId } = req.body;
      
      if (!userId || !membershipType) {
        return res.status(400).json({ error: 'User ID and membership type are required' });
      }

      const result = await Membership.create(userId, membershipType, startDate, endDate, paymentId);
      return res.status(201).json({ 
        message: 'Membership created successfully', 
        membershipId: result.membershipId 
      });
    } catch (error) {
      console.error('Error creating membership:', error);
      return res.status(500).json({ error: 'Failed to create membership' });
    }
  }

  /**
   * Get the active membership for a user
   */
  static async getUserMembership(req, res) {
    try {
      const userId = req.params.userId;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const membership = await Membership.getUserMembership(userId);
      
      if (!membership) {
        return res.status(404).json({ error: 'No active membership found for this user' });
      }
      
      return res.status(200).json(membership);
    } catch (error) {
      console.error('Error retrieving user membership:', error);
      return res.status(500).json({ error: 'Failed to retrieve user membership' });
    }
  }

  /**
   * Update a user's membership
   */
  static async updateMembership(req, res) {
    try {
      const { membershipId, membershipType } = req.body;
      
      if (!membershipId || !membershipType) {
        return res.status(400).json({ error: 'Membership ID and type are required' });
      }

      await Membership.updateMembership(membershipId, membershipType);
      return res.status(200).json({ message: 'Membership updated successfully' });
    } catch (error) {
      console.error('Error updating membership:', error);
      return res.status(500).json({ error: 'Failed to update membership' });
    }
  }

  /**
   * Cancel a user's membership
   */
  static async cancelMembership(req, res) {
    try {
      const { membershipId } = req.params;
      
      if (!membershipId) {
        return res.status(400).json({ error: 'Membership ID is required in the URL' });
      }

      await Membership.cancelMembership(parseInt(membershipId, 10));
      return res.status(200).json({ message: 'Membership cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling membership:', error);
      return res.status(500).json({ error: 'Failed to cancel membership' });
    }
  }

  /**
   * Get default benefits for a specific membership type
   */
  static async getMembershipBenefits(req, res) {
    try {
      const { membershipType } = req.params;
      
      if (!membershipType) {
        return res.status(400).json({ error: 'Membership type is required' });
      }

      const benefits = await Membership.getDefaultBenefits(membershipType);
      return res.status(200).json(benefits);
    } catch (error) {
      console.error('Error retrieving membership benefits:', error);
      return res.status(500).json({ error: 'Failed to retrieve membership benefits' });
    }
  }

  /**
   * Check and update expired memberships (admin function)
   */
  static async checkExpiredMemberships(req, res) {
    try {
      const updated = await Membership.checkAndUpdateExpiredMemberships();
      return res.status(200).json({ 
        message: 'Expired memberships checked successfully', 
        expiredCount: updated.length,
        expiredMemberships: updated
      });
    } catch (error) {
      console.error('Error checking expired memberships:', error);
      return res.status(500).json({ error: 'Failed to check expired memberships' });
    }
  }

  /**
   * Get the active membership for the currently authenticated user
   */
  static async getCurrentUserMembership(req, res) {
    try {
      const userId = req.user.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const membership = await Membership.getUserMembership(userId);
      
      if (!membership) {
        return res.status(404).json({ error: 'No active membership found for this user' });
      }
      
      return res.status(200).json(membership);
    } catch (error) {
      console.error('Error retrieving current user membership:', error);
      return res.status(500).json({ error: 'Failed to retrieve user membership' });
    }
  }

  /**
   * Upgrade a user's membership
   */
  static async upgradeMembership(req, res) {
    try {
      const userId = req.user.id;
      const { type } = req.body;
      
      if (!type) {
        return res.status(400).json({ error: 'Membership type is required' });
      }

      // Check if user has an active membership
      const existingMembership = await Membership.getUserMembership(userId);
      
      if (existingMembership) {
        // Update existing membership
        await Membership.updateMembership(userId, type);
        return res.status(200).json({ 
          message: 'Membership upgraded successfully',
          membershipType: type
        });
      } else {
        // Create new membership for the user
        const result = await Membership.create(userId, type);
        return res.status(201).json({ 
          message: 'New membership created successfully', 
          membershipId: result.membershipId,
          membershipType: type
        });
      }
    } catch (error) {
      console.error('Error upgrading membership:', error);
      return res.status(500).json({ error: 'Failed to upgrade membership' });
    }
  }

  /**
   * Get all memberships (admin only)
   */
  static async getAllMemberships(req, res) {
    try {
      const memberships = await Membership.getAllMemberships();
      return res.status(200).json(memberships);
    } catch (error) {
      console.error('Error retrieving all memberships:', error);
      return res.status(500).json({ error: 'Failed to retrieve all memberships' });
    }
  }

  /**
   * Update membership by ID (admin only)
   */
  static async updateMembershipById(req, res) {
    try {
      const { id } = req.params;
      const { type, status } = req.body;
      
      if (!id || (!type && !status)) {
        return res.status(400).json({ error: 'Membership ID and at least one of type or status are required' });
      }

      await Membership.updateMembershipById(id, type, status);
      return res.status(200).json({ message: 'Membership updated successfully' });
    } catch (error) {
      console.error('Error updating membership by ID:', error);
      return res.status(500).json({ error: 'Failed to update membership' });
    }
  }

  /**
   * Create membership for a user (admin only)
   */
  static async createMembershipForUser(req, res) {
    try {
      const { userId, membershipType } = req.body;
      
      if (!userId || !membershipType) {
        return res.status(400).json({ error: 'User ID and membership type are required' });
      }

      // Check if user already has an active membership
      const existingMembership = await Membership.getUserMembership(userId);
      if (existingMembership) {
        return res.status(400).json({ 
          error: 'User already has an active membership',
          existingMembership
        });
      }

      const result = await Membership.create(userId, membershipType);
      return res.status(201).json({ 
        message: 'Membership created successfully', 
        membershipId: result.membershipId 
      });
    } catch (error) {
      console.error('Error creating membership for user:', error);
      return res.status(500).json({ error: 'Failed to create membership' });
    }
  }

  /**
   * Delete membership (admin only)
   */
  static async deleteMembership(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Membership ID is required' });
      }

      await Membership.deleteMembership(id);
      return res.status(200).json({ message: 'Membership deleted successfully' });
    } catch (error) {
      console.error('Error deleting membership:', error);
      return res.status(500).json({ error: 'Failed to delete membership' });
    }
  }

  /**
   * Update a user's auto-renew status for their membership
   */
  static async updateAutoRenewStatus(req, res) {
    try {
      const { membershipId } = req.params;
      const { auto_renew } = req.body; // Expecting { "auto_renew": true/false }

      if (!membershipId) {
        return res.status(400).json({ error: 'Membership ID is required in the URL' });
      }

      if (typeof auto_renew !== 'boolean') {
          return res.status(400).json({ error: 'auto_renew field (boolean) is required in the body' });
      }

      // Add user check: ensure the authenticated user owns this membership
      const userId = req.user.id;
      const membership = await Membership.getMembershipById(parseInt(membershipId, 10)); // Need this model function

      if (!membership) {
          return res.status(404).json({ error: 'Membership not found' });
      }
      if (membership.user_id !== userId) {
          return res.status(403).json({ error: 'User not authorized to update this membership' });
      }

      await Membership.updateAutoRenew(parseInt(membershipId, 10), auto_renew);
      return res.status(200).json({ message: `Membership auto-renewal set to ${auto_renew}` });

    } catch (error) {
      console.error('Error updating auto-renew status:', error);
      // Check for specific errors if the model throws them, e.g., not found
      return res.status(500).json({ error: 'Failed to update auto-renew status' });
    }
  }
}

module.exports = MembershipController; 