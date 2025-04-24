const db = require('../config/dbConfig');

class Membership {
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS memberships (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type ENUM('basic', 'premium', 'platinum') NOT NULL DEFAULT 'basic',
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP,
                status ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
                auto_renew BOOLEAN DEFAULT true,
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
                membership_type ENUM('basic', 'premium', 'platinum') NOT NULL,
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

    static async create(userId, type = 'basic', startDate = null, endDate = null, paymentId = null) {
        const defaultBenefits = await this.getDefaultBenefits(type);
        
        // Calculate end date for membership (default to 1 month later if not provided)
        let calculatedEndDate = endDate;
        if (!calculatedEndDate) {
            const oneMonthLater = new Date();
            oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
            calculatedEndDate = oneMonthLater.toISOString().split('T')[0];
        }

        // Prepare payment history if payment ID is provided
        let paymentHistory = null;
        if (paymentId) {
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
            'SELECT * FROM memberships WHERE user_id = ? AND status = "active"',
            [userId]
        );
        return memberships[0] || null;
    }

    static async updateMembership(userId, type) {
        const benefits = await this.getDefaultBenefits(type);
        await db.query(
            `UPDATE memberships 
             SET type = ?, benefits = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ? AND status = "active"`,
            [type, JSON.stringify(benefits), userId]
        );
    }

    static async cancelMembership(userId) {
        await db.query(
            `UPDATE memberships 
             SET status = "cancelled", auto_renew = false, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ? AND status = "active"`,
            [userId]
        );
    }

    static async checkAndUpdateExpiredMemberships() {
        await db.query(
            `UPDATE memberships 
             SET status = "expired" 
             WHERE end_date < CURRENT_TIMESTAMP AND status = "active"`
        );
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
}

module.exports = Membership; 