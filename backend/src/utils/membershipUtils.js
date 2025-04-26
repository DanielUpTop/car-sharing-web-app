const User = require('../models/userModel');
const Cancellation = require('../models/cancellationModel');

// Membership tier definitions
const MEMBERSHIP_TIERS = {
    STANDARD: {
        freeCancellationsPerMonth: 1,
        discountPercentage: 0,
        priorityBooking: false,
        freeUpgrades: false,
        supportPriority: 'normal'
    },
    GOLD: {
        freeCancellationsPerMonth: 3,
        discountPercentage: 5,
        priorityBooking: true,
        freeUpgrades: false,
        supportPriority: 'high'
    },
    PLATINUM: {
        freeCancellationsPerMonth: 5,
        discountPercentage: 10,
        priorityBooking: true,
        freeUpgrades: true,
        supportPriority: 'vip'
    }
};

class MembershipUtils {
    /**
     * Get user's membership tier details
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Membership tier details
     */
    static async getMembershipDetails(userId) {
        const user = await User.getUserById(userId);
        const tier = user.membership_tier || 'STANDARD';
        return {
            ...MEMBERSHIP_TIERS[tier],
            tier
        };
    }
    
    /**
     * Check if user is eligible for free cancellation
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Whether user is eligible
     */
    static async isEligibleForFreeCancellation(userId) {
        const membershipDetails = await this.getMembershipDetails(userId);
        const remainingCancellations = await this.getRemainingFreeCancellations(userId);
        
        return remainingCancellations > 0;
    }
    
    /**
     * Get user's remaining free cancellations for current month
     * @param {number} userId - User ID
     * @returns {Promise<number>} Number of remaining free cancellations
     */
    static async getRemainingFreeCancellations(userId) {
        const membershipDetails = await this.getMembershipDetails(userId);
        
        // Calculate date range for current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        // Get used free cancellations this month
        const usedCancellationsCount = await Cancellation.getFreeCancellationsCount(
            userId, 
            startOfMonth.toISOString(), 
            endOfMonth.toISOString()
        );
        
        return Math.max(0, membershipDetails.freeCancellationsPerMonth - usedCancellationsCount);
    }
    
    /**
     * Check if user has priority booking privilege
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Whether user has priority booking
     */
    static async hasPriorityBooking(userId) {
        const membershipDetails = await this.getMembershipDetails(userId);
        return membershipDetails.priorityBooking;
    }
    
    /**
     * Check if user is eligible for free car upgrade
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Whether user is eligible for upgrade
     */
    static async isEligibleForFreeUpgrade(userId) {
        const membershipDetails = await this.getMembershipDetails(userId);
        return membershipDetails.freeUpgrades;
    }
    
    /**
     * Get user's discount percentage based on membership
     * @param {number} userId - User ID
     * @returns {Promise<number>} Discount percentage
     */
    static async getDiscountPercentage(userId) {
        const membershipDetails = await this.getMembershipDetails(userId);
        return membershipDetails.discountPercentage;
    }
    
    /**
     * Get user's support priority level
     * @param {number} userId - User ID
     * @returns {Promise<string>} Support priority level
     */
    static async getSupportPriority(userId) {
        const membershipDetails = await this.getMembershipDetails(userId);
        return membershipDetails.supportPriority;
    }

    /**
     * Get user's booking priority level
     * @param {number} userId - User ID
     * @returns {Promise<number>} Booking priority level (higher is better)
     */
    static async getBookingPriority(userId) {
        try {
            // Get user membership
            const membership = await User.getUserById(userId);
            if (!membership) return 1; // Default priority for non-members
            
            // Get benefits for membership tier
            const benefits = MEMBERSHIP_TIERS[membership.membership_tier] || MEMBERSHIP_TIERS['STANDARD'];
            
            return benefits.priorityBooking ? 2 : 1;
        } catch (error) {
            console.error('Error getting booking priority:', error);
            return 1; // Default priority on error
        }
    }

    /**
     * Get support level for user
     * @param {number} userId - User ID
     * @returns {Promise<string>} Support level
     */
    static async getSupportLevel(userId) {
        try {
            // Get user membership
            const membership = await User.getUserById(userId);
            if (!membership) return 'standard';
            
            // Get benefits for membership tier
            const benefits = MEMBERSHIP_TIERS[membership.membership_tier] || MEMBERSHIP_TIERS['STANDARD'];
            
            return benefits.supportPriority;
        } catch (error) {
            console.error('Error getting support level:', error);
            return 'standard';
        }
    }

    /**
     * Apply membership discount to a price
     * @param {number} price - Original price
     * @param {Object|null} membership - User's membership object
     * @returns {number} - Price after applying membership discount
     */
    static applyPriceDiscount(price, membership) {
        if (!membership || !price) return price;

        let discountPercentage = 0;
        
        switch (membership.membership_tier) {
            case 'STANDARD':
                discountPercentage = 0;
                break;
            case 'GOLD':
                discountPercentage = 5;
                break;
            case 'PLATINUM':
                discountPercentage = 10;
                break;
            default:
                return price;
        }

        return parseFloat((price * (1 - discountPercentage / 100)).toFixed(2));
    }

    /**
     * Get insurance coverage amount based on membership
     * @param {Object|null} membership - User's membership object
     * @returns {number} - Insurance coverage amount
     */
    static getInsuranceCoverage(membership) {
        if (!membership) return 0;

        switch (membership.membership_tier) {
            case 'STANDARD':
                return 500.00;
            case 'GOLD':
                return 1000.00;
            case 'PLATINUM':
                return 2000.00;
            default:
                return 0;
        }
    }

    /**
     * Check if user has access to 24/7 customer support
     * @param {Object|null} membership - User's membership object
     * @returns {boolean} - Whether user has 24/7 support
     */
    static has24HourSupport(membership) {
        if (!membership) return false;
        return membership.membership_tier === 'GOLD' || membership.membership_tier === 'PLATINUM';
    }

    /**
     * Check if user has access to dedicated customer support
     * @param {Object|null} membership - User's membership object
     * @returns {boolean} - Whether user has dedicated support
     */
    static hasDedicatedSupport(membership) {
        if (!membership) return false;
        return membership.membership_tier === 'PLATINUM';
    }

    /**
     * Check if user is eligible for free upgrades
     * @param {Object|null} membership - User's membership object
     * @returns {boolean} - Whether user is eligible for free upgrades
     */
    static isEligibleForFreeUpgrades(membership) {
        if (!membership) return false;
        return membership.membership_tier === 'PLATINUM';
    }

    /**
     * Get all membership benefits as an object
     * @param {Object|null} membership - User's membership object
     * @returns {Object} - All benefits as an object
     */
    static getAllBenefits(membership) {
        if (!membership) {
            return {
                discountPercentage: 0,
                insuranceCoverage: 0,
                hasPriorityBooking: false,
                hasVIPPriority: false,
                freeCancellations: 0,
                has24HourSupport: false,
                hasDedicatedSupport: false,
                isEligibleForFreeUpgrades: false
            };
        }

        const benefits = MEMBERSHIP_TIERS[membership.membership_tier] || MEMBERSHIP_TIERS['STANDARD'];

        return {
            discountPercentage: benefits.discountPercentage,
            insuranceCoverage: this.getInsuranceCoverage(membership),
            hasPriorityBooking: benefits.priorityBooking,
            hasVIPPriority: membership.membership_tier === 'PLATINUM',
            freeCancellations: benefits.freeCancellationsPerMonth,
            has24HourSupport: this.has24HourSupport(membership),
            hasDedicatedSupport: this.hasDedicatedSupport(membership),
            isEligibleForFreeUpgrades: this.isEligibleForFreeUpgrades(membership)
        };
    }

    /**
     * Get user's membership status and benefits
     * @param {number} userId - User ID
     * @returns {Promise<Object>} - Membership status and benefits
     */
    static async getUserMembershipStatus(userId) {
        if (!userId) return { isMember: false, benefits: this.getAllBenefits(null) };

        const membership = await User.getUserById(userId);
        
        return {
            isMember: !!membership,
            membership: membership || null,
            benefits: this.getAllBenefits(membership)
        };
    }
}

module.exports = MembershipUtils; 