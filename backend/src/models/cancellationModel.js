const connection = require('../config/db');
const Membership = require('./membershipModel');
const MembershipUtils = require('../utils/membershipUtils');
const db = require('../config/database');

class Cancellation {
    /**
     * Create the cancellations table
     * @returns {Promise} MySQL query promise
     */
    static createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS cancellations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                user_id INT NOT NULL,
                is_free BOOLEAN DEFAULT 0,
                reason VARCHAR(255),
                refund_amount DECIMAL(10, 2) DEFAULT 0.00,
                cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_booking_id (booking_id),
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        return connection.query(sql);
    }

    /**
     * Create a new cancellation record
     * @param {Object} cancellationData - Cancellation data including user_id, booking_id, and reason
     * @returns {Promise<Object>} Created cancellation object
     */
    static async createCancellation(cancellationData) {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO cancellations SET ?';
            cancellationData.created_at = new Date();
            
            db.query(query, cancellationData, (err, result) => {
                if (err) {
                    console.error('Error creating cancellation record:', err);
                    return reject(err);
                }
                resolve({ id: result.insertId, ...cancellationData });
            });
        });
    }

    /**
     * Get all cancellations for a user
     * @param {number} userId - User ID
     * @param {Object} options - Optional parameters like period (e.g., 'month', 'year')
     * @returns {Promise<Array>} Array of cancellation records
     */
    static async getUserCancellations(userId, options = {}) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM cancellations WHERE user_id = ?';
            const queryParams = [userId];
            
            // Filter by period if specified
            if (options.period) {
                let dateCondition = '';
                switch (options.period) {
                    case 'month':
                        dateCondition = ' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
                        break;
                    case 'year':
                        dateCondition = ' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
                        break;
                    // Add more periods as needed
                }
                query += dateCondition;
            }
            
            db.query(query, queryParams, (err, results) => {
                if (err) {
                    console.error('Error fetching user cancellations:', err);
                    return reject(err);
                }
                resolve(results);
            });
        });
    }

    /**
     * Count cancellations for a user in a specific period
     * @param {number} userId - User ID
     * @param {string} period - Period ('month', 'year', etc.)
     * @returns {Promise<number>} Number of cancellations
     */
    static async countCancellations(userId, period = 'month') {
        return new Promise((resolve, reject) => {
            let dateCondition = '';
            switch (period) {
                case 'month':
                    dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
                    break;
                case 'year':
                    dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
                    break;
                // Add more periods as needed
            }
            
            const query = `SELECT COUNT(*) as count FROM cancellations WHERE user_id = ? AND ${dateCondition}`;
            
            db.query(query, [userId], (err, results) => {
                if (err) {
                    console.error('Error counting cancellations:', err);
                    return reject(err);
                }
                resolve(results[0].count);
            });
        });
    }

    /**
     * Check if the cancellation is marked as free (no charge)
     * @param {number} cancellationId - Cancellation ID
     * @returns {Promise<boolean>} Whether the cancellation is free
     */
    static async isFreeCancel(cancellationId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT is_free FROM cancellations WHERE id = ?';
            
            db.query(query, [cancellationId], (err, results) => {
                if (err) {
                    console.error('Error checking if cancellation is free:', err);
                    return reject(err);
                }
                
                if (results.length === 0) {
                    return resolve(false);
                }
                
                resolve(results[0].is_free === 1);
            });
        });
    }

    /**
     * Mark a cancellation as free
     * @param {number} cancellationId - Cancellation ID
     * @returns {Promise<boolean>} Success status
     */
    static async markAsFree(cancellationId) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE cancellations SET is_free = 1 WHERE id = ?';
            
            db.query(query, [cancellationId], (err, result) => {
                if (err) {
                    console.error('Error marking cancellation as free:', err);
                    return reject(err);
                }
                resolve(result.affectedRows > 0);
            });
        });
    }

    /**
     * Get cancellation details by booking ID
     * @param {number} bookingId - Booking ID
     * @returns {Promise<Object>} Cancellation record
     */
    static getCancellationByBookingId(bookingId) {
        const sql = `
            SELECT * FROM cancellations
            WHERE booking_id = ?
        `;
        return connection.query(sql, [bookingId])
            .then(results => results[0] || null);
    }

    /**
     * Get user's free cancellations count within a date range
     * @param {number} userId - User ID
     * @param {Date} startDate - Start date for filtering
     * @param {Date} endDate - End date for filtering
     * @returns {Promise<number>} Count of free cancellations
     */
    static getFreeCancellationsCount(userId, startDate, endDate) {
        const sql = `
            SELECT COUNT(*) as count 
            FROM cancellations
            WHERE user_id = ? 
            AND is_free = 1
            AND cancelled_at BETWEEN ? AND ?
        `;
        return connection.query(sql, [userId, startDate, endDate])
            .then(results => results[0].count || 0);
    }

    /**
     * Get all cancellations statistics
     * @returns {Promise<Object>} Cancellation statistics
     */
    static getCancellationStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_cancellations,
                SUM(CASE WHEN is_free = 1 THEN 1 ELSE 0 END) as free_cancellations,
                SUM(refund_amount) as total_refunds
            FROM cancellations
        `;
        return connection.query(sql)
            .then(results => results[0] || { total_cancellations: 0, free_cancellations: 0, total_refunds: 0 });
    }

    /**
     * Check if a user is eligible for a free cancellation
     * @param {number} userId - User ID
     * @returns {Promise<{eligible: boolean, reason: string, remainingCancellations: number, membership: Object|null}>}
     */
    static async checkEligibility(userId) {
        // Get user's membership
        const membership = await Membership.getUserMembership(userId);
        const allowedCancellations = MembershipUtils.getFreeCancellations(membership);
        
        // Get current month in YYYY-MM format
        const today = new Date();
        const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        // Count user's free cancellations this month
        const [result] = await connection.query(
            `SELECT COUNT(*) as count FROM cancellations 
             WHERE user_id = ? AND cancelled_at BETWEEN ? AND ? AND is_free = true`,
            [userId, monthYear, today]
        );
        
        const usedCancellations = result[0].count || 0;
        const remainingCancellations = Math.max(0, allowedCancellations - usedCancellations);
        
        return {
            eligible: remainingCancellations > 0,
            reason: remainingCancellations > 0 
                ? `You have ${remainingCancellations} free cancellation(s) remaining this month.`
                : `You have used all your free cancellations for this month.`,
            remainingCancellations,
            membership
        };
    }

    /**
     * Record a cancellation
     * @param {number} userId - User ID
     * @param {number} bookingId - Booking ID
     * @param {boolean} isFree - Whether this is a free cancellation
     * @param {string} reason - Reason for cancellation
     * @param {number} refundAmount - Refund amount
     * @returns {Promise<number>} - ID of the new cancellation record
     */
    static async recordCancellation(userId, bookingId, isFree = false, reason = '', refundAmount = 0.00) {
        const today = new Date();
        
        const [result] = await connection.query(
            `INSERT INTO cancellations (user_id, booking_id, is_free, reason, refund_amount)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, bookingId, isFree ? 1 : 0, reason, refundAmount]
        );
        
        return result.insertId;
    }

    /**
     * Get user's cancellation history
     * @param {number} userId - User ID
     * @returns {Promise<Array>} - Cancellation records
     */
    static async getUserCancellationsHistory(userId) {
        const [rows] = await connection.query(
            `SELECT c.*, b.start_date, b.end_date, cr.make, cr.model
             FROM cancellations c
             JOIN bookings b ON c.booking_id = b.id
             JOIN cars cr ON b.car_id = cr.id
             WHERE c.user_id = ?
             ORDER BY c.cancelled_at DESC`,
            [userId]
        );
        
        return rows;
    }

    /**
     * Get user's cancellations for the current month
     * @param {number} userId - User ID
     * @returns {Promise<{total: number, free: number}>}
     */
    static async getCurrentMonthCancellations(userId) {
        const today = new Date();
        
        const [rows] = await connection.query(
            `SELECT 
               COUNT(*) as total,
               SUM(CASE WHEN is_free = true THEN 1 ELSE 0 END) as free
             FROM cancellations 
             WHERE user_id = ? AND cancelled_at BETWEEN ? AND ?`,
            [userId, today, today]
        );
        
        return {
            total: rows[0].total || 0,
            free: rows[0].free || 0
        };
    }
}

module.exports = Cancellation; 