const db = require('../config/dbConfig');

/**
 * Get user membership data
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User's membership data or null if not found
 */
async function getUserMembership(userId) {
    try {
        const query = `
            SELECT * FROM memberships
            WHERE user_id = ? AND status = 'active'
            LIMIT 1
        `;
        const [rows] = await db.query(query, [userId]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error getting user membership:', error);
        return null;
    }
}

module.exports = {
    getUserMembership
}; 