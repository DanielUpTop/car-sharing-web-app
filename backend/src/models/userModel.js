const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async createTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone_number VARCHAR(15),
                driving_license VARCHAR(50),
                role ENUM('admin', 'rentee') DEFAULT 'rentee',
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                membership_tier ENUM('STANDARD', 'PREMIUM', 'PLATINUM') DEFAULT 'STANDARD',
                remaining_cancellations INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        
        try {
            await db.query(query);
            console.log('Users table created successfully');
        } catch (error) {
            console.error('Error creating users table:', error);
            throw error;
        }
    }

    static async create({ first_name, last_name, email, password, phone_number, driving_license, verification_token, is_verified = false }) {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users (
                first_name, 
                last_name, 
                email, 
                password, 
                phone_number, 
                driving_license,
                verification_token,
                is_verified
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        try {
            const [result] = await db.query(query, [
                first_name,
                last_name,
                email,
                hashedPassword,
                phone_number,
                driving_license,
                verification_token,
                is_verified
            ]);
            return result.insertId;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        try {
            const [rows] = await db.query(query, [email]);
            return rows[0];
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }
    }

    static async findByVerificationToken(token) {
        const query = 'SELECT * FROM users WHERE verification_token = ?';
        try {
            const [rows] = await db.query(query, [token]);
            return rows[0];
        } catch (error) {
            console.error('Error finding user by verification token:', error);
            throw error;
        }
    }

    static async verifyEmail(userId) {
        const query = `
            UPDATE users 
            SET is_verified = true, verification_token = NULL 
            WHERE id = ?
        `;
        try {
            await db.query(query, [userId]);
            return true;
        } catch (error) {
            console.error('Error verifying email:', error);
            throw error;
        }
    }

    static async findById(userId) {
        const query = 'SELECT * FROM users WHERE id = ?';
        try {
            const [rows] = await db.query(query, [userId]);
            return rows[0];
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    static async update(userId, userData) {
        const query = `
            UPDATE users 
            SET 
                first_name = ?,
                last_name = ?,
                email = ?,
                phone_number = ?,
                driving_license = ?
            WHERE id = ?
        `;

        try {
            const [result] = await db.query(query, [
                userData.first_name,
                userData.last_name,
                userData.email,
                userData.phone_number,
                userData.driving_license,
                userId
            ]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    static async getDashboardStats(userId, timeRange = '6months', startDate = null, endDate = null) {
        try {
            let dateFilter = '';
            const params = [userId];

            if (timeRange === 'custom' && startDate && endDate) {
                dateFilter = 'AND b.start_date BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else {
                const months = timeRange === '1month' ? 1 : timeRange === '3months' ? 3 : 6;
                dateFilter = 'AND b.start_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)';
                params.push(months);
            }

            // Basic stats query
            const baseQuery = `
                SELECT 
                    COUNT(DISTINCT b.id) as totalBookings,
                    SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as activeBookings,
                    SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completedBookings,
                    SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelledBookings,
                    COALESCE(SUM(b.total_price), 0) as totalSpent,
                    COALESCE(AVG(DATEDIFF(b.end_date, b.start_date)), 0) as averageBookingDuration
                FROM bookings b
                WHERE b.user_id = ? ${dateFilter}
            `;

            // Monthly stats query
            const monthlyStatsQuery = `
                SELECT 
                    DATE_FORMAT(b.start_date, '%Y-%m') as month,
                    COUNT(*) as bookings,
                    SUM(b.total_price) as spent
                FROM bookings b
                WHERE b.user_id = ? ${dateFilter}
                GROUP BY DATE_FORMAT(b.start_date, '%Y-%m')
                ORDER BY month
            `;

            // Car type stats query
            const carTypeStatsQuery = `
                SELECT 
                    c.make,
                    COUNT(*) as bookings
                FROM bookings b
                JOIN cars c ON b.car_id = c.id
                WHERE b.user_id = ? ${dateFilter}
                GROUP BY c.make
            `;

            // Recent bookings query
            const recentBookingsQuery = `
                SELECT 
                    b.id,
                    b.start_date,
                    b.status,
                    b.total_price,
                    c.make,
                    c.model
                FROM bookings b
                JOIN cars c ON b.car_id = c.id
                WHERE b.user_id = ?
                ORDER BY b.created_at DESC
                LIMIT 5
            `;

            // Most booked car query
            const mostBookedCarQuery = `
                SELECT 
                    c.make,
                    c.model,
                    COUNT(*) as bookings
                FROM bookings b
                JOIN cars c ON b.car_id = c.id
                WHERE b.user_id = ? ${dateFilter}
                GROUP BY c.id, c.make, c.model
                ORDER BY bookings DESC
                LIMIT 1
            `;

            const [baseStats] = await db.query(baseQuery, params);
            const [monthlyStats] = await db.query(monthlyStatsQuery, params);
            const [carTypeStats] = await db.query(carTypeStatsQuery, params);
            const [recentBookings] = await db.query(recentBookingsQuery, [userId]);
            const [mostBookedCar] = await db.query(mostBookedCarQuery, params);

            return {
                ...baseStats[0],
                monthlyStats: monthlyStats || [],
                carTypeStats: carTypeStats || [],
                recentBookings: recentBookings || [],
                mostBookedCar: mostBookedCar[0] || null,
                averageBookingDuration: Math.round(baseStats[0]?.averageBookingDuration || 0)
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     * @param {number} id - User ID
     * @returns {Promise<Object|null>} User object or null if not found
     */
    static async getUserById(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE id = ?';
            db.query(query, [id], (err, results) => {
                if (err) {
                    console.error('Error fetching user by ID:', err);
                    return reject(err);
                }
                if (results.length === 0) {
                    return resolve(null);
                }
                resolve(results[0]);
            });
        });
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null if not found
     */
    static async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE email = ?';
            db.query(query, [email], (err, results) => {
                if (err) {
                    console.error('Error fetching user by email:', err);
                    return reject(err);
                }
                if (results.length === 0) {
                    return resolve(null);
                }
                resolve(results[0]);
            });
        });
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user object
     */
    static async createUser(userData) {
        return new Promise((resolve, reject) => {
            // Default membership tier is STANDARD if not provided
            const membershipTier = userData.membership_tier || 'STANDARD';
            
            // Set default remaining cancellations based on membership tier
            let remainingCancellations = 1; // Default for STANDARD
            
            if (membershipTier === 'PREMIUM') {
                remainingCancellations = 3;
            } else if (membershipTier === 'PLATINUM') {
                remainingCancellations = 5;
            }

            // Hash the password
            bcrypt.hash(userData.password, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing password:', err);
                    return reject(err);
                }

                const query = `INSERT INTO users 
                    (email, password, first_name, last_name, phone_number, profile_picture_url, is_admin, membership_tier, remaining_cancellations) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                db.query(
                    query,
                    [
                        userData.email,
                        hashedPassword,
                        userData.first_name,
                        userData.last_name,
                        userData.phone_number,
                        userData.profile_picture_url || null,
                        userData.is_admin || 0,
                        membershipTier,
                        remainingCancellations
                    ],
                    (err, result) => {
                        if (err) {
                            console.error('Error creating user:', err);
                            return reject(err);
                        }
                        
                        resolve(result.insertId);
                    }
                );
            });
        });
    }

    /**
     * Update user details
     * @param {number} id - User ID
     * @param {Object} userData - Updated user data
     * @returns {Promise<boolean>} Success status
     */
    static async updateUser(id, userData) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET ? WHERE id = ?';
            db.query(query, [userData, id], (err, result) => {
                if (err) {
                    console.error('Error updating user:', err);
                    return reject(err);
                }
                resolve(result.affectedRows > 0);
            });
        });
    }

    /**
     * Update user's membership tier
     * @param {number} id - User ID
     * @param {string} membershipTier - New membership tier
     * @returns {Promise<boolean>} Success status
     */
    static async updateMembershipTier(id, membershipTier) {
        return new Promise((resolve, reject) => {
            // Set cancellations based on membership tier
            let remainingCancellations = 1; // Default for STANDARD
            
            if (membershipTier === 'PREMIUM') {
                remainingCancellations = 3;
            } else if (membershipTier === 'PLATINUM') {
                remainingCancellations = 5;
            }
            
            const query = 'UPDATE users SET membership_tier = ?, remaining_cancellations = ? WHERE id = ?';
            db.query(query, [membershipTier, remainingCancellations, id], (err, result) => {
                if (err) {
                    console.error('Error updating membership tier:', err);
                    return reject(err);
                }
                resolve(result.affectedRows > 0);
            });
        });
    }
}

module.exports = User; 