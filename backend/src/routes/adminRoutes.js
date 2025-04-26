const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/adminAuth');
const db = require('../config/dbConfig');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(isAdmin);

// Get all cars (admin view)
router.get('/cars', async (req, res) => {
    try {
        const [cars] = await db.query(`
            SELECT * FROM cars
            ORDER BY created_at DESC
        `);
        res.json(cars);
    } catch (error) {
        console.error('Error fetching cars:', error);
        res.status(500).json({ message: 'Error fetching cars' });
    }
});

// Add a new car
router.post('/cars', async (req, res) => {
    try {
        const {
            make, model, year, registration_number,
            price_per_hour, type, image_url, location
        } = req.body;

        const [result] = await db.query(
            `INSERT INTO cars (
                make, model, year, registration_number, 
                price_per_hour, type, image_url, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [make, model, year, registration_number, 
             price_per_hour, type, image_url, location]
        );

        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error adding car:', error);
        res.status(500).json({ message: 'Error adding car' });
    }
});

// Update a car
router.put('/cars/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // If there's a new image_url and an old one exists, delete the old file
        if (updates.image_url) {
            const [oldCar] = await db.query('SELECT image_url FROM cars WHERE id = ?', [id]);
            if (oldCar[0]?.image_url) {
                const oldFilename = oldCar[0].image_url.split('/').pop();
                const oldFilepath = path.join(__dirname, '../uploads', oldFilename);
                await fs.unlink(oldFilepath).catch(() => {});
            }
        }

        await db.query(
            'UPDATE cars SET ? WHERE id = ?',
            [updates, id]
        );

        res.json({ message: 'Car updated successfully' });
    } catch (error) {
        console.error('Error updating car:', error);
        res.status(500).json({ message: 'Error updating car' });
    }
});

// Delete a car
router.delete('/cars/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM cars WHERE id = ?', [id]);
        res.json({ message: 'Car deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting car' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT id, first_name, last_name, email, role, status, created_at
            FROM users
            WHERE role != 'admin'
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Get all bookings with user and car details
router.get('/bookings', async (req, res) => {
    try {
        console.log('Admin bookings request received');
        console.log('User from token:', req.user);

        // Verify admin role
        if (!req.user || req.user.role !== 'admin') {
            console.log('Access denied - not an admin:', req.user);
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        // Check if tables exist
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME IN ('bookings', 'users', 'cars')
        `, [process.env.DB_NAME]);

        console.log('Available tables:', tables);

        const [bookings] = await db.query(`
            SELECT 
                b.*,
                u.first_name,
                u.last_name,
                u.email,
                c.make,
                c.model,
                c.registration_number,
                c.address,
                c.location,
                c.latitude,
                c.longitude
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            ORDER BY b.created_at DESC
        `);

        console.log('Number of bookings found:', bookings.length);
        if (bookings.length > 0) {
            console.log('Sample booking:', bookings[0]);
        }

        // Format the data to match frontend expectations
        const formattedBookings = bookings.map(booking => ({
            id: booking.id,
            user_id: booking.user_id,
            car_id: booking.car_id,
            start_date: booking.start_date,
            end_date: booking.end_date,
            status: booking.status,
            total_price: booking.total_price,
            created_at: booking.created_at,
            user: {
                first_name: booking.first_name,
                last_name: booking.last_name,
                email: booking.email
            },
            car: {
                make: booking.make,
                model: booking.model,
                registration_number: booking.registration_number,
                address: booking.address || booking.location || `${booking.latitude}, ${booking.longitude}` || 'No location set for this vehicle'
            }
        }));

        console.log('Sending formatted bookings:', formattedBookings.length);
        res.json(formattedBookings);
    } catch (error) {
        console.error('Error in GET /bookings:', error);
        res.status(500).json({ 
            message: 'Error fetching bookings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get admin stats
router.get('/stats', async (req, res) => {
    try {
        // Get user count (excluding admins)
        const [userCount] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE role = "rentee"'
        );

        // Get car count
        const [carCount] = await db.query(
            'SELECT COUNT(*) as count FROM cars'
        );

        // Get booking count
        const [bookingCount] = await db.query(
            'SELECT COUNT(*) as count FROM bookings'
        );

        // Get total revenue
        const [revenue] = await db.query(
            'SELECT SUM(total_price) as total FROM bookings WHERE status = "completed"'
        );

        res.json({
            users: userCount[0].count,
            cars: carCount[0].count,
            bookings: bookingCount[0].count,
            revenue: revenue[0].total || 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// Update car status
router.put('/cars/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const [result] = await db.query(
            'UPDATE cars SET availability_status = ? WHERE id = ?',
            [status, req.params.id]
        );
        res.json({ message: 'Car status updated successfully' });
    } catch (error) {
        console.error('Error updating car status:', error);
        res.status(500).json({ message: 'Error updating car status' });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Don't allow updating email or password through this route
        delete updates.email;
        delete updates.password;

        await db.query(
            'UPDATE users SET ? WHERE id = ?',
            [updates, id]
        );

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
});

// Get user details
router.get('/users/:id', async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = ?',
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user' });
    }
});

// Get booking statistics
router.get('/bookings/stats', async (req, res) => {
    try {
        const { timeFrame } = req.query;
        let dateFilter = '';

        switch (timeFrame) {
            case 'week':
                dateFilter = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
                break;
            case 'month':
                dateFilter = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
                break;
            case 'year':
                dateFilter = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
                break;
            default:
                dateFilter = '';
        }

        // Get total bookings and revenue
        const [totals] = await db.query(`
            SELECT 
                COUNT(*) as totalBookings,
                SUM(total_price) as totalRevenue,
                AVG(total_price) as averageBookingValue
            FROM bookings b
            WHERE 1=1 ${dateFilter}
        `);

        // Get bookings by status
        const [statusCounts] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM bookings b
            WHERE 1=1 ${dateFilter}
            GROUP BY status
        `);

        // Get revenue by month
        const [monthlyRevenue] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(total_price) as revenue
            FROM bookings b
            WHERE 1=1 ${dateFilter}
            GROUP BY month
            ORDER BY month
        `);

        // Get popular cars
        const [popularCars] = await db.query(`
            SELECT 
                c.make,
                c.model,
                COUNT(*) as bookings
            FROM bookings b
            JOIN cars c ON b.car_id = c.id
            WHERE 1=1 ${dateFilter}
            GROUP BY c.id
            ORDER BY bookings DESC
            LIMIT 4
        `);

        // Get customer statistics
        const [customerStats] = await db.query(`
            SELECT 
                COUNT(DISTINCT user_id) as totalCustomers,
                COUNT(DISTINCT CASE 
                    WHEN b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
                    THEN user_id 
                    END) as newCustomers,
                COUNT(DISTINCT CASE 
                    WHEN user_id IN (
                        SELECT user_id 
                        FROM bookings 
                        GROUP BY user_id 
                        HAVING COUNT(*) > 1
                    ) 
                    THEN user_id 
                    END) as returningCustomers
            FROM bookings b
            WHERE 1=1 ${dateFilter}
        `);

        // Get peak booking hours
        const [peakHours] = await db.query(`
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as bookings
            FROM bookings b
            WHERE 1=1 ${dateFilter}
            GROUP BY HOUR(created_at)
            ORDER BY hour
        `);

        const bookingsByStatus = {
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0
        };

        statusCounts.forEach(status => {
            bookingsByStatus[status.status] = status.count;
        });

        const revenueByMonth = {};
        monthlyRevenue.forEach(item => {
            revenueByMonth[item.month] = item.revenue;
        });

        // Get comparative data (this period vs last period)
        const getComparativePeriod = (timeFrame) => {
            switch (timeFrame) {
                case 'week':
                    return 'INTERVAL 1 WEEK';
                case 'month':
                    return 'INTERVAL 1 MONTH';
                case 'year':
                    return 'INTERVAL 1 YEAR';
                default:
                    return 'INTERVAL 1 MONTH';
            }
        };

        // Get comparative stats
        const [comparativeStats] = await db.query(`
            SELECT 
                period,
                COUNT(*) as totalBookings,
                SUM(total_price) as totalRevenue,
                AVG(total_price) as averageBookingValue
            FROM (
                SELECT 
                    total_price,
                    CASE 
                        WHEN created_at >= DATE_SUB(NOW(), ${getComparativePeriod(timeFrame)})
                        THEN 'current'
                        WHEN created_at >= DATE_SUB(DATE_SUB(NOW(), ${getComparativePeriod(timeFrame)}), ${getComparativePeriod(timeFrame)})
                        THEN 'previous'
                    END as period
                FROM bookings
                WHERE created_at >= DATE_SUB(DATE_SUB(NOW(), ${getComparativePeriod(timeFrame)}), ${getComparativePeriod(timeFrame)})
            ) as periods
            GROUP BY period
        `);

        // Calculate revenue forecast using simple linear regression
        const [revenueHistory] = await db.query(`
            SELECT 
                DATE(created_at) as date,
                SUM(total_price) as daily_revenue
            FROM bookings
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        // Simple linear regression for forecasting
        const forecast = calculateForecast(revenueHistory);

        // Get seasonal trends
        const [seasonalTrends] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as bookings,
                SUM(total_price) as revenue,
                COUNT(*) * 100.0 / (
                    SELECT COUNT(*) FROM bookings 
                    WHERE created_at >= ${dateFilter}
                ) as utilization
            FROM bookings
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
            GROUP BY month
            ORDER BY month
        `);

        // Get hourly distribution
        const [hourlyDistribution] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%H:00') as hour,
                COUNT(*) as bookings,
                AVG(total_price) as avgRevenue
            FROM bookings
            WHERE created_at >= ${dateFilter}
            GROUP BY HOUR(created_at)
            ORDER BY HOUR(created_at)
        `);

        // Get weekday analysis
        const [weekdayAnalysis] = await db.query(`
            SELECT 
                DAYNAME(created_at) as day,
                COUNT(*) as bookings,
                COUNT(*) * 100.0 / (
                    SELECT COUNT(*) FROM bookings 
                    WHERE created_at >= ${dateFilter}
                ) as utilization
            FROM bookings
            WHERE created_at >= ${dateFilter}
            GROUP BY DAYNAME(created_at)
            ORDER BY DAYOFWEEK(created_at)
        `);

        res.json({
            totalBookings: totals[0].totalBookings,
            totalRevenue: totals[0].totalRevenue || 0,
            averageBookingValue: totals[0].averageBookingValue || 0,
            bookingsByStatus,
            revenueByMonth,
            popularCars,
            customerStats: {
                totalCustomers: customerStats[0].totalCustomers,
                newCustomers: customerStats[0].newCustomers,
                returningCustomers: customerStats[0].returningCustomers
            },
            peakHours,
            comparativeStats: {
                current: comparativeStats.find(s => s.period === 'current') || { totalBookings: 0, totalRevenue: 0, averageBookingValue: 0 },
                previous: comparativeStats.find(s => s.period === 'previous') || { totalBookings: 0, totalRevenue: 0, averageBookingValue: 0 }
            },
            forecast: {
                nextWeek: forecast.nextWeek,
                nextMonth: forecast.nextMonth,
                trend: forecast.trend
            },
            trends: {
                seasonalTrends,
                hourlyDistribution,
                weekdayAnalysis
            }
        });
    } catch (error) {
        console.error('Error fetching booking stats:', error);
        res.status(500).json({ message: 'Error fetching booking statistics' });
    }
});

// Helper function for forecasting
function calculateForecast(data) {
    if (data.length < 2) return { nextWeek: 0, nextMonth: 0, trend: 0 };

    const xValues = data.map((_, i) => i);
    const yValues = data.map(d => d.daily_revenue);
    
    const n = data.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
    const sumXX = xValues.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const nextWeek = intercept + slope * (n + 7);
    const nextMonth = intercept + slope * (n + 30);
    const trend = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';

    return {
        nextWeek: Math.max(0, nextWeek),
        nextMonth: Math.max(0, nextMonth),
        trend
    };
}

// Get analytics data for admin dashboard
router.get('/analytics', async (req, res) => {
    try {
        // Get total revenue and calculate growth
        const [revenueResult] = await db.query(`
            SELECT 
                COALESCE(SUM(total_price), 0) as total_revenue,
                COUNT(*) as total_bookings
            FROM bookings
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        `);

        const [previousRevenueResult] = await db.query(`
            SELECT COALESCE(SUM(total_price), 0) as total_revenue
            FROM bookings
            WHERE created_at BETWEEN DATE_SUB(NOW(), INTERVAL 2 MONTH) AND DATE_SUB(NOW(), INTERVAL 1 MONTH)
        `);

        const revenueGrowth = previousRevenueResult[0].total_revenue === 0 ? 0 :
            ((revenueResult[0].total_revenue - previousRevenueResult[0].total_revenue) / previousRevenueResult[0].total_revenue) * 100;

        // Get active users
        const [activeUsersResult] = await db.query(`
            SELECT COUNT(DISTINCT user_id) as active_users 
            FROM bookings
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        `);

        // Get available cars
        const [availableCarsResult] = await db.query(`
            SELECT COUNT(*) as available_cars 
            FROM cars
            WHERE availability_status = 'available'
        `);

        // Get previous month's bookings for growth calculation
        const [previousBookingsResult] = await db.query(`
            SELECT COUNT(*) as total_bookings
            FROM bookings
            WHERE created_at BETWEEN DATE_SUB(NOW(), INTERVAL 2 MONTH) AND DATE_SUB(NOW(), INTERVAL 1 MONTH)
        `);

        const bookingGrowth = previousBookingsResult[0].total_bookings === 0 ? 0 :
            ((revenueResult[0].total_bookings - previousBookingsResult[0].total_bookings) / previousBookingsResult[0].total_bookings) * 100;

        // Get revenue by month
        const [revenueByMonth] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COALESCE(SUM(total_price), 0) as revenue
            FROM bookings
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month
            ORDER BY month
        `);

        // Get bookings by status
        const [bookingsByStatus] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM bookings
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            GROUP BY status
        `);

        // Get popular cars
        const [popularCars] = await db.query(`
            SELECT 
                CONCAT(c.make, ' ', c.model) as car,
                COUNT(b.id) as bookings,
                COALESCE(SUM(b.total_price), 0) as revenue
            FROM cars c
            LEFT JOIN bookings b ON c.id = b.car_id
            WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            GROUP BY c.id, c.make, c.model
            ORDER BY bookings DESC
            LIMIT 5
        `);

        res.json({
            overview: {
                totalRevenue: revenueResult[0].total_revenue,
                totalBookings: revenueResult[0].total_bookings,
                activeUsers: activeUsersResult[0].active_users,
                availableCars: availableCarsResult[0].available_cars,
                revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
                bookingGrowth: parseFloat(bookingGrowth.toFixed(2))
            },
            revenueByMonth: revenueByMonth.map(item => ({
                month: item.month,
                revenue: parseFloat(item.revenue)
            })),
            bookingsByStatus: bookingsByStatus.map(item => ({
                status: item.status,
                count: parseInt(item.count)
            })),
            popularCars: popularCars.map(car => ({
                car: car.car,
                bookings: parseInt(car.bookings),
                revenue: parseFloat(car.revenue)
            }))
        });
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

// Update user status
router.put('/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Error updating user status' });
    }
});

// Get user activity logs
router.get('/users/:id/logs', async (req, res) => {
    try {
        const [logs] = await db.query(
            'SELECT * FROM user_activity_logs WHERE user_id = ? ORDER BY timestamp DESC',
            [req.params.id]
        );
        res.json(logs);
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).json({ message: 'Error fetching user logs' });
    }
});

// Get all memberships with user details (admin view)
router.get('/memberships', async (req, res) => {
    // Log entry point and confirmed user
    console.log(`[GET /admin/memberships] Handler entered. User: ${req.user?.email}, Role: ${req.user?.role}`); 
    
    try {
        console.log('[GET /admin/memberships] Attempting database query...');
        const [memberships] = await db.query(`
            SELECT 
                m.id as membership_id, 
                m.user_id, 
                u.first_name as user_first_name, 
                u.last_name as user_last_name, 
                u.email as user_email, 
                m.type, 
                m.start_date, 
                m.end_date, 
                m.status, 
                m.auto_renew 
            FROM memberships m
            JOIN users u ON m.user_id = u.id
            ORDER BY m.start_date DESC
        `);
        
        // Log successful query result
        console.log(`[GET /admin/memberships] Database query successful. Found ${memberships.length} memberships.`);
        
        // Log before sending response
        console.log('[GET /admin/memberships] Sending successful response.');
        res.json(memberships);
    } catch (error) {
        // Log the specific error encountered
        console.error('[GET /admin/memberships] <<<< DATABASE QUERY OR PROCESSING ERROR >>>>', error); 
        res.status(500).json({ message: 'Error fetching memberships' });
    }
});

// Initialize membership tiers directly
router.post('/initialize-membership-tiers', async (req, res) => {
    try {
        console.log('[POST /admin/initialize-membership-tiers] Creating and populating membership_tiers table');
        
        // Drop the table if it exists but is problematic
        // await db.query('DROP TABLE IF EXISTS membership_tiers');
        // console.log('[POST /admin/initialize-membership-tiers] Dropped existing table to recreate it');
        
        // First, check if table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS membership_tiers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                benefits JSON,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        console.log('[POST /admin/initialize-membership-tiers] Table exists or was created');
        
        try {
            // Check if there are any existing tiers
            const [existingTiers] = await db.query('SELECT COUNT(*) as count FROM membership_tiers');
            console.log(`[POST /admin/initialize-membership-tiers] Found ${existingTiers[0].count} existing tiers`);
            
            if (existingTiers[0].count === 0) {
                console.log('[POST /admin/initialize-membership-tiers] No existing tiers found, creating defaults');
                
                // Insert default tiers
                await db.query(`
                    INSERT INTO membership_tiers (type, name, description, price, benefits, is_active)
                    VALUES 
                    (?, ?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?, ?),
                    (?, ?, ?, ?, ?, ?)
                `, [
                    'basic', 'Basic', 'Standard membership with basic benefits', 9.99, 
                    JSON.stringify(['5% discount on rentals', 'Basic insurance coverage', 'Standard booking priority']), 
                    true,
                    'premium', 'Premium', 'Enhanced membership with priority booking', 19.99, 
                    JSON.stringify(['10% discount on rentals', 'Enhanced insurance coverage', 'Priority booking', '24/7 customer support']), 
                    true,
                    'platinum', 'Platinum', 'Premium membership with all benefits', 29.99, 
                    JSON.stringify(['15% discount on rentals', 'Premium insurance coverage', 'VIP booking priority', 'Dedicated customer support', 'Free cancellations']), 
                    true
                ]);
                
                console.log('[POST /admin/initialize-membership-tiers] Default tiers created');
                
                // Verify the tiers were created
                const [verifyTiers] = await db.query('SELECT COUNT(*) as count FROM membership_tiers');
                console.log(`[POST /admin/initialize-membership-tiers] After insertion, found ${verifyTiers[0].count} tiers`);
                
                res.status(201).json({ 
                    message: 'Membership tiers initialized successfully',
                    count: verifyTiers[0].count 
                });
            } else {
                console.log('[POST /admin/initialize-membership-tiers] Tiers already exist');
                res.status(200).json({ 
                    message: 'Membership tiers already exist',
                    count: existingTiers[0].count 
                });
            }
        } catch (sqlError) {
            console.error('[POST /admin/initialize-membership-tiers] SQL Error:', sqlError);
            res.status(500).json({ 
                message: 'SQL Error during tier initialization', 
                error: sqlError.message,
                sqlState: sqlError.sqlState,
                sqlCode: sqlError.code
            });
        }
    } catch (error) {
        console.error('[POST /admin/initialize-membership-tiers] Error:', error);
        res.status(500).json({ message: 'Error initializing membership tiers', error: error.message });
    }
});

// Get all membership tiers
router.get('/membership-tiers', async (req, res) => {
    try {
        console.log('[GET /admin/membership-tiers] Handler entered');
        
        // Check if the membership_tiers table exists, if not create it
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'membership_tiers'
        `, [process.env.DB_NAME || 'car_sharing_db']);
        
        console.log(`[GET /admin/membership-tiers] Table check result: ${tables.length} tables found`);
        
        if (tables.length === 0) {
            console.log('[GET /admin/membership-tiers] Creating membership_tiers table as it does not exist');
            // Create the membership_tiers table if it doesn't exist
            await db.query(`
                CREATE TABLE membership_tiers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    type VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    benefits JSON,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            console.log('[GET /admin/membership-tiers] Inserting default membership tiers');
            // Insert default tiers
            await db.query(`
                INSERT INTO membership_tiers (type, name, description, price, benefits, is_active)
                VALUES 
                (?, ?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?, ?)
            `, [
                'basic', 'Basic', 'Standard membership with basic benefits', 9.99, 
                JSON.stringify(['5% discount on rentals', 'Basic insurance coverage', 'Standard booking priority']), 
                true,
                'premium', 'Premium', 'Enhanced membership with priority booking', 19.99, 
                JSON.stringify(['10% discount on rentals', 'Enhanced insurance coverage', 'Priority booking', '24/7 customer support']), 
                true,
                'platinum', 'Platinum', 'Premium membership with all benefits', 29.99, 
                JSON.stringify(['15% discount on rentals', 'Premium insurance coverage', 'VIP booking priority', 'Dedicated customer support', 'Free cancellations']), 
                true
            ]);
        } else {
            console.log('[GET /admin/membership-tiers] membership_tiers table exists');
        }
        
        // Get all membership tiers
        const [tiers] = await db.query(`
            SELECT * FROM membership_tiers
            ORDER BY price ASC
        `);
        
        console.log(`[GET /admin/membership-tiers] Found ${tiers.length} tiers in raw form`);
        
        if (tiers.length === 0) {
            console.log('[GET /admin/membership-tiers] No tiers found, inserting defaults');
            
            // Insert default tiers if none exist
            await db.query(`
                INSERT INTO membership_tiers (type, name, description, price, benefits, is_active)
                VALUES 
                (?, ?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?, ?),
                (?, ?, ?, ?, ?, ?)
            `, [
                'basic', 'Basic', 'Standard membership with basic benefits', 9.99, 
                JSON.stringify(['5% discount on rentals', 'Basic insurance coverage', 'Standard booking priority']), 
                true,
                'premium', 'Premium', 'Enhanced membership with priority booking', 19.99, 
                JSON.stringify(['10% discount on rentals', 'Enhanced insurance coverage', 'Priority booking', '24/7 customer support']), 
                true,
                'platinum', 'Platinum', 'Premium membership with all benefits', 29.99, 
                JSON.stringify(['15% discount on rentals', 'Premium insurance coverage', 'VIP booking priority', 'Dedicated customer support', 'Free cancellations']), 
                true
            ]);
            
            // Fetch tiers again after insertion
            const [newTiers] = await db.query(`
                SELECT * FROM membership_tiers
                ORDER BY price ASC
            `);
            
            console.log(`[GET /admin/membership-tiers] After insertion, found ${newTiers.length} membership tiers`);
            
            if (newTiers.length > 0) {
                // Process benefits properly for each tier
                const processedTiers = newTiers.map(tier => {
                    // Make a copy of the tier to avoid modifying the original
                    const processedTier = {...tier};
                    
                    // Check if benefits is already a parsed object or a string
                    if (typeof processedTier.benefits === 'string') {
                        try {
                            processedTier.benefits = JSON.parse(processedTier.benefits);
                        } catch (err) {
                            console.error(`[GET /admin/membership-tiers] Error parsing benefits for tier ${processedTier.id}:`, err);
                            processedTier.benefits = []; // Default to empty array if parsing fails
                        }
                    }
                    
                    return processedTier;
                });
                
                console.log(`[GET /admin/membership-tiers] Returning ${processedTiers.length} processed tiers`);
                return res.json(processedTiers);
            }
        }
        
        // Process benefits properly for each tier
        const processedTiers = tiers.map(tier => {
            // Make a copy of the tier to avoid modifying the original
            const processedTier = {...tier};
            
            // Check if benefits is already a parsed object or a string
            if (typeof processedTier.benefits === 'string') {
                try {
                    processedTier.benefits = JSON.parse(processedTier.benefits);
                } catch (err) {
                    console.error(`[GET /admin/membership-tiers] Error parsing benefits for tier ${processedTier.id}:`, err);
                    processedTier.benefits = []; // Default to empty array if parsing fails
                }
            }
            
            return processedTier;
        });
        
        console.log(`[GET /admin/membership-tiers] Returning ${processedTiers.length} processed tiers`);
        res.json(processedTiers);
    } catch (error) {
        console.error('[GET /admin/membership-tiers] Error:', error);
        res.status(500).json({ message: 'Error fetching membership tiers', error: error.message });
    }
});

// Create a new membership tier
router.post('/membership-tiers', async (req, res) => {
    try {
        const { type, name, description, price, benefits, is_active } = req.body;
        
        // Validate required fields
        if (!type || !name || price === undefined) {
            return res.status(400).json({ message: 'Type, name, and price are required' });
        }
        
        // Check if type already exists
        const [existing] = await db.query('SELECT id FROM membership_tiers WHERE type = ?', [type]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Membership tier with this type already exists' });
        }
        
        // Insert new tier
        const [result] = await db.query(`
            INSERT INTO membership_tiers (type, name, description, price, benefits, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            type, 
            name, 
            description || '', 
            price, 
            JSON.stringify(benefits || []), 
            is_active !== undefined ? is_active : true
        ]);
        
        res.status(201).json({ 
            id: result.insertId,
            message: 'Membership tier created successfully' 
        });
    } catch (error) {
        console.error('Error creating membership tier:', error);
        res.status(500).json({ message: 'Error creating membership tier' });
    }
});

// Update a membership tier
router.put('/membership-tiers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, name, description, price, benefits, is_active } = req.body;
        
        // Check if tier exists
        const [existing] = await db.query('SELECT id FROM membership_tiers WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Membership tier not found' });
        }
        
        // If changing type, check if new type already exists (for another tier)
        if (type) {
            const [typeExists] = await db.query(
                'SELECT id FROM membership_tiers WHERE type = ? AND id != ?', 
                [type, id]
            );
            if (typeExists.length > 0) {
                return res.status(400).json({ message: 'Another tier with this type already exists' });
            }
        }
        
        // Prepare update data
        const updates = {};
        if (type) updates.type = type;
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = price;
        if (benefits) updates.benefits = JSON.stringify(benefits);
        if (is_active !== undefined) updates.is_active = is_active;
        
        // Update tier
        await db.query(
            'UPDATE membership_tiers SET ? WHERE id = ?',
            [updates, id]
        );
        
        res.json({ message: 'Membership tier updated successfully' });
    } catch (error) {
        console.error('Error updating membership tier:', error);
        res.status(500).json({ message: 'Error updating membership tier' });
    }
});

// Update membership status
router.put('/memberships/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['active', 'expired', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status value',
                validStatuses 
            });
        }
        
        // Update membership status
        const [result] = await db.query(
            'UPDATE memberships SET status = ? WHERE id = ?',
            [status, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Membership not found' });
        }
        
        // If cancelling, also set auto_renew to false
        if (status === 'cancelled') {
            await db.query(
                'UPDATE memberships SET auto_renew = FALSE WHERE id = ?',
                [id]
            );
        }
        
        res.json({ message: 'Membership status updated successfully' });
    } catch (error) {
        console.error('Error updating membership status:', error);
        res.status(500).json({ message: 'Error updating membership status' });
    }
});

// Update booking status
router.put('/bookings/:id/status', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status value
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status value',
                validStatuses
            });
        }

        // Start transaction
        await connection.beginTransaction();

        // Update booking status
        await connection.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);

        // If booking is cancelled, update car availability
        if (status === 'cancelled') {
            const [booking] = await connection.query('SELECT car_id FROM bookings WHERE id = ?', [id]);
            if (booking.length) {
                await connection.query(
                    'UPDATE cars SET availability_status = ? WHERE id = ?',
                    ['available', booking[0].car_id]
                );
            }
        }

        // Commit transaction
        await connection.commit();
        res.json({ message: 'Booking status updated successfully' });
    } catch (error) {
        // Rollback in case of error
        await connection.rollback();
        console.error('Error updating booking status:', error);
        res.status(500).json({ 
            message: 'Error updating booking status',
            error: error.message 
        });
    } finally {
        connection.release();
    }
});

// Get booking details with user and car info
router.get('/bookings/:id', async (req, res) => {
    try {
        const [booking] = await db.query(`
            SELECT 
                b.*,
                u.first_name,
                u.last_name,
                u.email,
                c.make,
                c.model,
                c.registration_number,
                c.address,
                c.location,
                c.latitude,
                c.longitude
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            WHERE b.id = ?
        `, [req.params.id]);

        if (booking.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const formattedBooking = {
            id: booking[0].id,
            user_id: booking[0].user_id,
            car_id: booking[0].car_id,
            start_date: booking[0].start_date,
            end_date: booking[0].end_date,
            status: booking[0].status,
            total_price: booking[0].total_price,
            created_at: booking[0].created_at,
            user: {
                first_name: booking[0].first_name,
                last_name: booking[0].last_name,
                email: booking[0].email
            },
            car: {
                make: booking[0].make,
                model: booking[0].model,
                registration_number: booking[0].registration_number,
                address: booking[0].address || booking[0].location || `${booking[0].latitude}, ${booking[0].longitude}` || 'No location set for this vehicle'
            }
        };

        // Remove duplicate fields
        delete formattedBooking.first_name;
        delete formattedBooking.last_name;
        delete formattedBooking.email;
        delete formattedBooking.make;
        delete formattedBooking.model;
        delete formattedBooking.registration_number;

        res.json(formattedBooking);
    } catch (error) {
        console.error('Error fetching booking details:', error);
        res.status(500).json({ message: 'Error fetching booking details' });
    }
});

// Create maintenance record
router.post('/cars/:id/maintenance', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            maintenance_type,
            description,
            scheduled_date,
            cost
        } = req.body;

        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            // Create maintenance record
            const [result] = await conn.query(
                `INSERT INTO maintenance_records (
                    car_id, maintenance_type, description,
                    scheduled_date, status, cost
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, maintenance_type, description, scheduled_date, 'scheduled', cost]
            );

            // Update car status
            await conn.query(
                'UPDATE cars SET availability_status = ? WHERE id = ?',
                ['maintenance', id]
            );

            await conn.commit();
            res.status(201).json({
                id: result.insertId,
                message: 'Maintenance scheduled successfully'
            });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error scheduling maintenance:', error);
        res.status(500).json({ message: 'Error scheduling maintenance' });
    }
});

// Get maintenance history
router.get('/cars/:id/maintenance', async (req, res) => {
    try {
        const [records] = await db.query(
            `SELECT * FROM maintenance_records 
             WHERE car_id = ? 
             ORDER BY scheduled_date DESC`,
            [req.params.id]
        );
        res.json(records);
    } catch (error) {
        console.error('Error fetching maintenance records:', error);
        res.status(500).json({ message: 'Error fetching maintenance records' });
    }
});

// Update maintenance record
router.put('/maintenance/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            await conn.query(
                'UPDATE maintenance_records SET ? WHERE id = ?',
                [updates, id]
            );

            // If maintenance is completed, update car status
            if (updates.status === 'completed') {
                const [record] = await conn.query(
                    'SELECT car_id FROM maintenance_records WHERE id = ?',
                    [id]
                );
                
                await conn.query(
                    'UPDATE cars SET availability_status = ? WHERE id = ?',
                    ['available', record[0].car_id]
                );
            }

            await conn.commit();
            res.json({ message: 'Maintenance record updated successfully' });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error('Error updating maintenance record:', error);
        res.status(500).json({ message: 'Error updating maintenance record' });
    }
});

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        // Get total users
        const [[userStats]] = await db.query(`
            SELECT COUNT(*) as totalUsers 
            FROM users 
            WHERE role = 'rentee'
        `);

        // Get total cars
        const [[carStats]] = await db.query(`
            SELECT COUNT(*) as totalCars 
            FROM cars
        `);

        // Get active bookings and total revenue
        const [[bookingStats]] = await db.query(`
            SELECT 
                COUNT(*) as activeBookings,
                COALESCE(SUM(total_price), 0) as totalRevenue
            FROM bookings 
            WHERE status = 'confirmed'
        `);

        // Get recent bookings
        const [recentBookings] = await db.query(`
            SELECT 
                b.id,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                CONCAT(c.make, ' ', c.model) as car_details,
                b.start_date,
                b.status,
                b.total_price
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN cars c ON b.car_id = c.id
            ORDER BY b.created_at DESC
            LIMIT 5
        `);

        // Get popular cars
        const [popularCars] = await db.query(`
            SELECT 
                c.id,
                c.make,
                c.model,
                COUNT(b.id) as bookings_count
            FROM cars c
            LEFT JOIN bookings b ON c.id = b.car_id
            GROUP BY c.id
            ORDER BY bookings_count DESC
            LIMIT 5
        `);

        res.json({
            totalUsers: userStats.totalUsers,
            totalCars: carStats.totalCars,
            activeBookings: bookingStats.activeBookings,
            totalRevenue: bookingStats.totalRevenue,
            recentBookings,
            popularCars
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
});

// Debug endpoint - directly return membership tiers
router.get('/membership-tiers-debug', async (req, res) => {
    try {
        console.log('[GET /admin/membership-tiers-debug] Debug endpoint called');
        
        // Directly query the database without any complex logic
        const [tiers] = await db.query('SELECT * FROM membership_tiers');
        
        console.log(`[GET /admin/membership-tiers-debug] Found ${tiers.length} tiers in raw form:`, tiers);
        
        // Process benefits properly
        const processedTiers = tiers.map(tier => {
            // Make a copy of the tier to avoid modifying the original
            const processedTier = {...tier};
            
            // Check if benefits is already a parsed object or a string
            if (typeof processedTier.benefits === 'string') {
                try {
                    processedTier.benefits = JSON.parse(processedTier.benefits);
                } catch (err) {
                    console.error(`[GET /admin/membership-tiers-debug] Error parsing benefits for tier ${processedTier.id}:`, err);
                    processedTier.benefits = []; // Default to empty array if parsing fails
                }
            }
            
            return processedTier;
        });
        
        console.log(`[GET /admin/membership-tiers-debug] Processed ${processedTiers.length} tiers for response`);
        
        // Return the processed data
        res.json({
            message: 'Debug endpoint response',
            count: processedTiers.length,
            tiers: processedTiers
        });
    } catch (error) {
        console.error('[GET /admin/membership-tiers-debug] Error:', error);
        res.status(500).json({ 
            message: 'Error in debug endpoint', 
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router; 