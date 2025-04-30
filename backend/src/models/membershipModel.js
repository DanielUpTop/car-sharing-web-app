const db = require('../config/database');

// Membership tiers and their benefits
const MEMBERSHIP_TIERS = {
    NONE: {
        name: 'Non-Member',
        freeCancellationsPerMonth: 0,
        priorityBooking: false,
        freeUpgrades: false,
        supportPriority: 'standard',
        description: 'Default status with no additional benefits',
    },
    STANDARD: {
        name: 'Standard',
        freeCancellationsPerMonth: 1,
        priorityBooking: false,
        freeUpgrades: false,
        supportPriority: 'normal',
        description: 'Basic membership with standard benefits',
    },
    PREMIUM: {
        name: 'Premium',
        freeCancellationsPerMonth: 3,
        priorityBooking: true,
        freeUpgrades: false,
        supportPriority: 'high',
        description: 'Enhanced membership with priority booking and more free cancellations',
    },
    PLATINUM: {
        name: 'Platinum',
        freeCancellationsPerMonth: 5,
        priorityBooking: true,
        freeUpgrades: true,
        supportPriority: 'highest',
        description: 'Premium membership with all benefits including free upgrades',
    }
};

class Membership {
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS memberships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type ENUM('none', 'basic', 'premium', 'platinum') NOT NULL DEFAULT 'none',
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP, -- Will store Stripe's period end for active/cancelling subscriptions
                status ENUM('active', 'expired', 'cancelled', 'pending', 'cancelling') NOT NULL DEFAULT 'active', -- Added 'pending', 'cancelling'
                auto_renew BOOLEAN DEFAULT true,
                stripe_subscription_id VARCHAR(255) NULL UNIQUE, -- Added Stripe Subscription ID
                benefits JSON,
                payment_history JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_type (type),
                INDEX idx_status (status)
            )
        `;
        await db.query(sql);

        // Create membership_benefits table for storing benefit templates
        const benefitsSql = `
            CREATE TABLE IF NOT EXISTS membership_benefits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                membership_type ENUM('none', 'basic', 'premium', 'platinum') NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                discount_percentage INT,
                insurance_coverage DECIMAL(10,2),
                priority_booking BOOLEAN DEFAULT false,
                free_cancellations INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_benefit (membership_type, name)
            )
        `;
        await db.query(benefitsSql);
    }

    static async create(userId, type = 'none', startDate = null, endDate = null, paymentId = null) {
        const defaultBenefits = await this.getDefaultBenefits(type);
        
        // Calculate end date for membership (default to 1 month later if not provided)
        let calculatedEndDate = endDate;
        if (!calculatedEndDate && type !== 'none') {
            const oneMonthLater = new Date();
            oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
            calculatedEndDate = oneMonthLater.toISOString().split('T')[0];
        }

        // Prepare payment history if payment ID is provided
        let paymentHistory = null;
        if (paymentId && type !== 'none') {
            paymentHistory = JSON.stringify([{
                paymentId,
                amount: type === 'basic' ? 9.99 : (type === 'premium' ? 19.99 : 29.99),
                date: new Date().toISOString()
            }]);
        }

        // Insert the membership record
        const [result] = await db.query(
            `INSERT INTO memberships (user_id, type, start_date, end_date, benefits, payment_history) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId, 
                type, 
                startDate || new Date().toISOString().split('T')[0],
                calculatedEndDate,
                JSON.stringify(defaultBenefits),
                paymentHistory
            ]
        );
        
        return { membershipId: result.insertId };
    }

    static async getDefaultBenefits(type) {
        const [benefits] = await db.query(
            'SELECT * FROM membership_benefits WHERE membership_type = ?',
            [type]
        );
        return benefits;
    }

    static async getUserMembership(userId) {
        const [memberships] = await db.query(
            `SELECT * FROM memberships 
             WHERE user_id = ? AND status = 'active'
             ORDER BY updated_at DESC 
             LIMIT 1`,
            [userId]
        );
        return memberships[0] || null;
    }

    static async getMembershipById(membershipId) {
        const [memberships] = await db.query(
            'SELECT * FROM memberships WHERE id = ?',
            [membershipId]
        );
        return memberships[0] || null;
    }

    static async updateMembership(userId, type) {
        const benefits = await this.getDefaultBenefits(type);
        
        // Calculate new end date (1 month from now)
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + 1);

        await db.query(
            `UPDATE memberships 
             SET type = ?, 
                 benefits = ?, 
                 status = 'active', 
                 auto_renew = true, 
                 start_date = CURRENT_TIMESTAMP, 
                 end_date = ?, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ? AND status IN ('active', 'cancelled')
             ORDER BY updated_at DESC 
             LIMIT 1`,
            [type, JSON.stringify(benefits), newEndDate, userId]
        );
    }

    static async updateAutoRenew(membershipId, autoRenewStatus) {
        await db.query(
            `UPDATE memberships SET auto_renew = ? WHERE id = ?`,
            [autoRenewStatus, membershipId]
        );
    }

    static async cancelMembership(membershipId) {
        await db.query(
            `UPDATE memberships 
             SET status = "cancelled", auto_renew = false, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND status = "active"`,
            [membershipId]
        );
    }

    static async checkAndUpdateExpiredMemberships() {
        // First mark memberships as expired
        await db.query(
            `UPDATE memberships 
             SET status = "expired" 
             WHERE end_date < CURRENT_TIMESTAMP AND status = "active"`
        );
        
        // For cancelled memberships that have reached their end date, convert to non-member type
        const [expiredMemberships] = await db.query(
            `SELECT id, user_id FROM memberships 
             WHERE end_date < CURRENT_TIMESTAMP AND status = "cancelled"`
        );
        
        // Create new 'none' type memberships for users whose memberships expired
        for (const membership of expiredMemberships) {
            try {
                // Create a new 'none' type membership
                await this.create(membership.user_id, 'none');
                
                // Mark the old membership as expired
                await db.query(
                    `UPDATE memberships 
                     SET status = "expired"
                     WHERE id = ?`,
                    [membership.id]
                );
                
                console.log(`Converted user ${membership.user_id} to non-member after membership expiration`);
            } catch (error) {
                console.error(`Error converting user ${membership.user_id} to non-member:`, error);
            }
        }
        
        return expiredMemberships;
    }

    static async getAllMemberships() {
        const [results] = await db.query(`
            SELECT m.*, 
                   u.email, u.first_name, u.last_name
            FROM memberships m
            LEFT JOIN users u ON m.user_id = u.id
            ORDER BY m.created_at DESC
        `);

        // Format the results to include user information
        return results.map(membership => ({
            ...membership,
            user: {
                email: membership.email,
                first_name: membership.first_name,
                last_name: membership.last_name
            }
        }));
    }

    static async updateMembershipById(id, type = null, status = null) {
        let updateFields = [];
        let params = [];

        // Only update fields that are provided
        if (type) {
            updateFields.push('type = ?');
            params.push(type);
        }

        if (status) {
            updateFields.push('status = ?');
            params.push(status);
        }

        if (updateFields.length === 0) {
            return; // Nothing to update
        }

        // Add the membership ID to the params array
        params.push(id);

        await db.query(
            `UPDATE memberships 
             SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            params
        );
    }

    static async deleteMembership(id) {
        await db.query(
            'DELETE FROM memberships WHERE id = ?',
            [id]
        );
    }

    /**
     * Get all membership tiers
     * @returns {Object} All membership tiers and their benefits
     */
    static getAllTiers() {
        return MEMBERSHIP_TIERS;
    }

    /**
     * Get membership tier details
     * @param {string} tier - Membership tier (STANDARD, PREMIUM, PLATINUM)
     * @returns {Object|null} Membership tier details or null if not found
     */
    static getTierDetails(tier) {
        return MEMBERSHIP_TIERS[tier] || null;
    }

    /**
     * Check if a user has remaining free cancellations
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Whether user has remaining free cancellations
     */
    static async hasRemainingFreeCancellations(userId) {
        try {
            // Get user membership tier
            const userQuery = 'SELECT membership_tier FROM users WHERE id = ?';
            const user = await new Promise((resolve, reject) => {
                db.query(userQuery, [userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results[0]);
                });
            });

            if (!user) return false;

            const tierDetails = this.getTierDetails(user.membership_tier);
            if (!tierDetails) return false;

            // Count recent cancellations
            const cancellationsQuery = `
                SELECT COUNT(*) as count 
                FROM cancellations 
                WHERE user_id = ? 
                AND is_free = 1 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            `;

            const cancellations = await new Promise((resolve, reject) => {
                db.query(cancellationsQuery, [userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results[0]);
                });
            });

            return cancellations.count < tierDetails.freeCancellationsPerMonth;
        } catch (error) {
            console.error('Error checking free cancellations:', error);
            return false;
        }
    }

    /**
     * Get number of remaining free cancellations for a user
     * @param {number} userId - User ID
     * @returns {Promise<number>} Number of remaining free cancellations
     */
    static async getRemainingFreeCancellations(userId) {
        try {
            // Get user membership tier
            const userQuery = 'SELECT membership_tier FROM users WHERE id = ?';
            const user = await new Promise((resolve, reject) => {
                db.query(userQuery, [userId], (err, results) => {
                    if (err) return reject(err);
                    if (!results.length) return resolve(null);
                    resolve(results[0]);
                });
            });

            if (!user) return 0;

            const tierDetails = this.getTierDetails(user.membership_tier);
            if (!tierDetails) return 0;

            // Count recent free cancellations
            const cancellationsQuery = `
                SELECT COUNT(*) as count 
                FROM cancellations 
                WHERE user_id = ? 
                AND is_free = 1 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            `;

            const cancellations = await new Promise((resolve, reject) => {
                db.query(cancellationsQuery, [userId], (err, results) => {
                    if (err) return reject(err);
                    resolve(results[0]);
                });
            });

            return Math.max(0, tierDetails.freeCancellationsPerMonth - cancellations.count);
        } catch (error) {
            console.error('Error getting remaining free cancellations:', error);
            return 0;
        }
    }

    /**
     * Check if user has priority booking
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Whether user has priority booking
     */
    static async hasPriorityBooking(userId) {
        try {
            const query = 'SELECT membership_tier FROM users WHERE id = ?';
            
            const user = await new Promise((resolve, reject) => {
                db.query(query, [userId], (err, results) => {
                    if (err) return reject(err);
                    if (!results.length) return resolve(null);
                    resolve(results[0]);
                });
            });

            if (!user) return false;
            
            const tierDetails = this.getTierDetails(user.membership_tier);
            return tierDetails ? tierDetails.priorityBooking : false;
        } catch (error) {
            console.error('Error checking priority booking status:', error);
            return false;
        }
    }

    /**
     * Check if user is eligible for free upgrades
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} Whether user is eligible for free upgrades
     */
    static async isEligibleForFreeUpgrades(userId) {
        try {
            const query = 'SELECT membership_tier FROM users WHERE id = ?';
            
            const user = await new Promise((resolve, reject) => {
                db.query(query, [userId], (err, results) => {
                    if (err) return reject(err);
                    if (!results.length) return resolve(null);
                    resolve(results[0]);
                });
            });

            if (!user) return false;
            
            const tierDetails = this.getTierDetails(user.membership_tier);
            return tierDetails ? tierDetails.freeUpgrades : false;
        } catch (error) {
            console.error('Error checking free upgrades eligibility:', error);
            return false;
        }
    }

    /**
     * Get support priority level for a user
     * @param {number} userId - User ID
     * @returns {Promise<string>} Support priority level ('normal', 'high', 'highest')
     */
    static async getSupportPriority(userId) {
        try {
            const query = 'SELECT membership_tier FROM users WHERE id = ?';
            
            const user = await new Promise((resolve, reject) => {
                db.query(query, [userId], (err, results) => {
                    if (err) return reject(err);
                    if (!results.length) return resolve(null);
                    resolve(results[0]);
                });
            });

            if (!user) return 'normal';
            
            const tierDetails = this.getTierDetails(user.membership_tier);
            return tierDetails ? tierDetails.supportPriority : 'normal';
        } catch (error) {
            console.error('Error getting support priority:', error);
            return 'normal';
        }
    }
}

module.exports = Membership; 