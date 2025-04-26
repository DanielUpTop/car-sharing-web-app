const db = require('../config/dbConfig');
const logger = require('../utils/logger');

class Insurance {
    static async createTable() {
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS insurance_policies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    booking_id INT NOT NULL,
                    coverage_type ENUM('basic', 'standard', 'premium') NOT NULL,
                    coverage_amount DECIMAL(10,2) NOT NULL,
                    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    end_date TIMESTAMP NULL,
                    status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
                )
            `);

            await db.query(`
                CREATE TABLE IF NOT EXISTS insurance_claims (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    policy_id INT NOT NULL,
                    incident_date TIMESTAMP NOT NULL,
                    description TEXT NOT NULL,
                    claim_amount DECIMAL(10,2) NOT NULL,
                    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (policy_id) REFERENCES insurance_policies(id) ON DELETE CASCADE
                )
            `);

            console.log('Insurance tables created successfully');
        } catch (error) {
            console.error('Error creating insurance tables:', error);
            throw error;
        }
    }

    static async createPolicy(policyData) {
        const { booking_id, coverage_type, coverage_amount } = policyData;
        try {
            const [result] = await db.query(
                `INSERT INTO insurance_policies (booking_id, coverage_type, coverage_amount)
                 VALUES (?, ?, ?)`,
                [booking_id, coverage_type, coverage_amount]
            );
            return { id: result.insertId, ...policyData };
        } catch (error) {
            console.error('Error creating insurance policy:', error);
            throw error;
        }
    }

    static async getUserPolicies(userId) {
        try {
            const [rows] = await db.query(
                `SELECT ip.*, b.start_date as booking_start, b.end_date as booking_end, c.make, c.model
                 FROM insurance_policies ip
                 JOIN bookings b ON ip.booking_id = b.id
                 JOIN cars c ON b.car_id = c.id
                 WHERE b.user_id = ?
                 ORDER BY ip.created_at DESC`,
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching user policies:', error);
            throw error;
        }
    }

    static async getActivePolicies() {
        try {
            const [rows] = await db.query(
                `SELECT ip.*, b.user_id, b.start_date as booking_start, b.end_date as booking_end,
                        c.make, c.model, u.email as user_email
                 FROM insurance_policies ip
                 JOIN bookings b ON ip.booking_id = b.id
                 JOIN cars c ON b.car_id = c.id
                 JOIN users u ON b.user_id = u.id
                 WHERE ip.status = 'active'
                 ORDER BY ip.created_at DESC`
            );
            return rows;
        } catch (error) {
            console.error('Error fetching active policies:', error);
            throw error;
        }
    }

    static async getPolicyById(policyId) {
        try {
            const [rows] = await db.query(
                `SELECT ip.*, b.user_id, b.start_date as booking_start, b.end_date as booking_end,
                        c.make, c.model, u.email as user_email
                 FROM insurance_policies ip
                 JOIN bookings b ON ip.booking_id = b.id
                 JOIN cars c ON b.car_id = c.id
                 JOIN users u ON b.user_id = u.id
                 WHERE ip.id = ?`,
                [policyId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error fetching policy:', error);
            throw error;
        }
    }

    static async createClaim(claimData) {
        const { policy_id, incident_date, description, claim_amount } = claimData;
        try {
            console.log('Creating claim with data:', {
                policy_id, 
                incident_date, 
                description: description ? description.substring(0, 20) + '...' : null,
                claim_amount
            });
            
            if (!policy_id || !incident_date || !description || !claim_amount) {
                console.error('Missing required data for claim creation');
                throw new Error('Missing required data for claim creation');
            }
            
            // Format the date if needed
            let formattedDate = incident_date;
            if (typeof incident_date === 'string' && !incident_date.includes('T')) {
                // If the date is just in YYYY-MM-DD format, add time
                formattedDate = incident_date + ' 00:00:00';
            }
            
            console.log('Executing SQL insert with parameters:', [policy_id, formattedDate, description, claim_amount]);
            
            const [result] = await db.query(
                `INSERT INTO insurance_claims (policy_id, incident_date, description, claim_amount)
                 VALUES (?, ?, ?, ?)`,
                [policy_id, formattedDate, description, claim_amount]
            );
            
            console.log('Claim created successfully with ID:', result.insertId);
            return { id: result.insertId, ...claimData, status: 'pending' };
        } catch (error) {
            console.error('Error creating insurance claim:', error);
            throw error;
        }
    }

    static async getUserClaims(userId) {
        try {
            const [rows] = await db.query(
                `SELECT ic.*, ip.coverage_type, ip.coverage_amount,
                        b.start_date as booking_start, b.end_date as booking_end,
                        c.make, c.model
                 FROM insurance_claims ic
                 JOIN insurance_policies ip ON ic.policy_id = ip.id
                 JOIN bookings b ON ip.booking_id = b.id
                 JOIN cars c ON b.car_id = c.id
                 WHERE b.user_id = ?
                 ORDER BY ic.created_at DESC`,
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching user claims:', error);
            throw error;
        }
    }

    static async updateClaimStatus(claimId, status) {
        try {
            const [result] = await db.query(
                `UPDATE insurance_claims
                 SET status = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [status, claimId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating claim status:', error);
            throw error;
        }
    }

    static async getClaimById(claimId) {
        try {
            const [rows] = await db.query(
                `SELECT ic.*, ip.coverage_type, ip.coverage_amount,
                        b.user_id, b.start_date as booking_start, b.end_date as booking_end,
                        c.make, c.model, u.email as user_email
                 FROM insurance_claims ic
                 JOIN insurance_policies ip ON ic.policy_id = ip.id
                 JOIN bookings b ON ip.booking_id = b.id
                 JOIN cars c ON b.car_id = c.id
                 JOIN users u ON b.user_id = u.id
                 WHERE ic.id = ?`,
                [claimId]
            );
            return rows[0];
        } catch (error) {
            console.error('Error fetching claim:', error);
            throw error;
        }
    }
}

module.exports = Insurance; 