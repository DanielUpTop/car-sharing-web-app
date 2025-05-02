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
                phone_number VARCHAR(20),
                driving_license VARCHAR(50),
                date_of_birth DATE,
                driving_license_expiry DATE,
                driving_license_country VARCHAR(100),
                address VARCHAR(255),
                city VARCHAR(100),
                postcode VARCHAR(20),
                emergency_contact_name VARCHAR(100),
                emergency_contact_number VARCHAR(20),
                role ENUM('admin', 'rentee') DEFAULT 'rentee',
                status ENUM('active', 'blocked') DEFAULT 'active',
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                reward_points INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        
        try {
            await db.query(query);
            console.log('Users table definition includes emergency contacts.');
        } catch (error) {
            console.error('Error creating users table:', error);
            throw error;
        }
    }

    static async create({ 
        first_name, 
        last_name, 
        email, 
        password, 
        phone_number, 
        driving_license, 
        date_of_birth, 
        driving_license_expiry,
        address,
        city,
        postcode,
        driving_license_country,
        emergency_contact_name,
        emergency_contact_number,
        verification_token, 
        is_verified = false 
    }) {
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
                date_of_birth,
                driving_license_expiry,
                driving_license_country,
                address,
                city,
                postcode,
                emergency_contact_name,
                emergency_contact_number,
                verification_token,
                is_verified
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        try {
            const [result] = await db.query(query, [
                first_name,
                last_name,
                email,
                hashedPassword,
                phone_number,
                driving_license,
                date_of_birth,
                driving_license_expiry,
                driving_license_country,
                address,
                city,
                postcode,
                emergency_contact_name,
                emergency_contact_number,
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
        // Select all relevant fields, including the new ones
        // Use template literal for multi-line query
        const query = ` 
            SELECT 
                id, first_name, last_name, email, phone_number, 
                driving_license, date_of_birth, driving_license_expiry, 
                driving_license_country, address, city, postcode, 
                emergency_contact_name, emergency_contact_number,
                role, status, is_verified, 
                reward_points,
                created_at, updated_at 
            FROM users 
            WHERE id = ?
        `; 
        try {
            const [rows] = await db.query(query, [userId]);
            // Convert date fields from DB format (if necessary, depends on DB driver)
            if (rows[0]?.date_of_birth && typeof rows[0].date_of_birth === 'string') {
                 rows[0].date_of_birth = new Date(rows[0].date_of_birth);
            }
             if (rows[0]?.driving_license_expiry && typeof rows[0].driving_license_expiry === 'string') {
                 rows[0].driving_license_expiry = new Date(rows[0].driving_license_expiry);
            }
            return rows[0];
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    static async update(userId, userData) {
        // Extract fields that can be updated via profile
        const { 
            first_name, 
            last_name, 
            email, 
            phone_number, 
            driving_license, 
            date_of_birth, 
            driving_license_expiry, 
            address, 
            city, 
            postcode, 
            driving_license_country,
            emergency_contact_name,
            emergency_contact_number
        } = userData;

        // Construct the SET part of the query dynamically based on provided fields
        // Note: This basic example updates all provided fields. 
        // A more robust implementation might check which fields are actually provided in userData.
        const query = `
            UPDATE users 
            SET 
                first_name = ?, 
                last_name = ?, 
                email = ?, 
                phone_number = ?, 
                driving_license = ?, 
                date_of_birth = ?, 
                driving_license_expiry = ?, 
                driving_license_country = ?, 
                address = ?, 
                city = ?, 
                postcode = ?,
                emergency_contact_name = ?,
                emergency_contact_number = ?
            WHERE id = ?
        `;

        try {
            const [result] = await db.query(query, [
                first_name,
                last_name,
                email, // Ensure email uniqueness is handled in the route
                phone_number,
                driving_license,
                date_of_birth, // Assuming date object or valid string format
                driving_license_expiry, // Assuming date object or valid string format
                driving_license_country,
                address,
                city,
                postcode,
                emergency_contact_name,
                emergency_contact_number,
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
        const query = `
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.phone_number, 
                u.driving_license, u.date_of_birth, u.driving_license_expiry, 
                u.driving_license_country, u.address, u.city, u.postcode,
                u.emergency_contact_name, u.emergency_contact_number,
                u.role, u.status, u.is_verified, u.created_at, u.updated_at,
                m.tier as membership_tier, m.start_date as membership_start_date, m.end_date as membership_end_date, m.status as membership_status,
                ins.policy_number as insurance_policy_number, ins.coverage_type as insurance_coverage_type, 
                ins.start_date as insurance_start_date, ins.end_date as insurance_end_date, ins.status as insurance_status
            FROM users u
            LEFT JOIN memberships m ON u.id = m.user_id
            LEFT JOIN insurance ins ON u.id = ins.user_id
            WHERE u.id = ?
        `;
         try {
             const [rows] = await db.query(query, [id]);
             if (rows.length === 0) {
                 return null;
             }
             // Basic date formatting/conversion if needed
             const user = rows[0];
             if (user.date_of_birth && typeof user.date_of_birth === 'string') {
                 user.date_of_birth = new Date(user.date_of_birth);
             }
             if (user.driving_license_expiry && typeof user.driving_license_expiry === 'string') {
                 user.driving_license_expiry = new Date(user.driving_license_expiry);
             }
              // Format other date fields if necessary (membership, insurance)
             // ... 
             return user;
         } catch (error) {
             console.error('Error getting user by ID with details:', error);
             throw error;
         }
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} User object or null if not found
     */
    static async getUserByEmail(email) {
        const query = `
            SELECT 
                id, first_name, last_name, email, password, phone_number, 
                driving_license, date_of_birth, driving_license_expiry, 
                driving_license_country, address, city, postcode,
                emergency_contact_name, emergency_contact_number,
                role, status, is_verified, created_at, updated_at 
            FROM users 
            WHERE email = ?
        `;
        try {
            const [rows] = await db.query(query, [email]);
            return rows[0]; // Convert dates if needed, similar to findById
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
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

    // New method to get all users for admin
    static async getAll() {
        const query = `
            SELECT 
                id, first_name, last_name, email, phone_number, 
                driving_license, date_of_birth, driving_license_expiry, 
                driving_license_country, address, city, postcode, 
                emergency_contact_name, emergency_contact_number,
                role, status, is_verified, 
                reward_points,
                created_at, updated_at 
            FROM users 
            ORDER BY last_name, first_name
        `;
        try {
            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    }

    // New method for admin updates
    static async adminUpdateUser(userId, userData) {
        // Define fields an admin can update
        const allowedFields = [
            'first_name', 'last_name', 'email', 'phone_number', 
            'driving_license', 'date_of_birth', 'driving_license_expiry', 
            'driving_license_country', 'address', 'city', 'postcode',
            'emergency_contact_name', 'emergency_contact_number',
            'role', 'status', 'is_verified'
        ];

        const fieldsToUpdate = {};
        const queryParams = [];
        let setClause = '';

        // Build the SET clause dynamically only with allowed fields present in userData
        allowedFields.forEach(field => {
            if (userData[field] !== undefined) {
                if (queryParams.length > 0) {
                    setClause += ', ';
                }
                // Handle boolean conversion for is_verified
                if (field === 'is_verified') {
                    setClause += `${field} = ?`;
                    queryParams.push(Boolean(userData[field]));
                } else {
                     setClause += `${field} = ?`;
                     queryParams.push(userData[field]);
                }
            }
        });

        if (queryParams.length === 0) {
            // No valid fields to update
            console.log('Admin update user: No valid fields provided.');
            return false; 
        }

        queryParams.push(userId); // Add userId for the WHERE clause

        const query = `UPDATE users SET ${setClause} WHERE id = ?`;

        try {
            const [result] = await db.query(query, queryParams);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating user by admin:', error);
            // Handle specific errors like duplicate email if necessary
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Email address already in use.');
            }
            throw error;
        }
    }

    // New method to add reward points
    static async addRewardPoints(userId, pointsToAdd) {
        if (pointsToAdd <= 0) {
            throw new Error('Points to add must be positive.');
        }
        const query = `
            UPDATE users 
            SET reward_points = reward_points + ? 
            WHERE id = ?
        `;
        try {
            const [result] = await db.query(query, [pointsToAdd, userId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error adding reward points:', error);
            throw error;
        }
    }
}

module.exports = User; 