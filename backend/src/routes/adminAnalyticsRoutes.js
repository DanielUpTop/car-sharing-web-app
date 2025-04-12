const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const isAdmin = require('../middleware/adminAuth');
const db = require('../config/dbConfig');

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(isAdmin);

// Get all analytics data
router.get('/analytics', async (req, res) => {
    try {
        // Get current month and previous month revenue and bookings for growth calculation
        const [[monthlyComparison]] = await db.query(`
            WITH CurrentMonth AS (
                SELECT 
                    COUNT(*) as current_bookings,
                    COALESCE(SUM(total_price), 0) as current_revenue
                FROM bookings
                WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
                AND MONTH(created_at) = MONTH(CURRENT_DATE)
            ),
            PreviousMonth AS (
                SELECT 
                    COUNT(*) as previous_bookings,
                    COALESCE(SUM(total_price), 0) as previous_revenue
                FROM bookings
                WHERE YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH)
                AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)
            )
            SELECT 
                CurrentMonth.*,
                PreviousMonth.*,
                CASE 
                    WHEN PreviousMonth.previous_revenue = 0 THEN 100
                    ELSE ROUND(((CurrentMonth.current_revenue - PreviousMonth.previous_revenue) / PreviousMonth.previous_revenue) * 100, 1)
                END as revenue_growth,
                CASE 
                    WHEN PreviousMonth.previous_bookings = 0 THEN 100
                    ELSE ROUND(((CurrentMonth.current_bookings - PreviousMonth.previous_bookings) / PreviousMonth.previous_bookings) * 100, 1)
                END as booking_growth
            FROM CurrentMonth, PreviousMonth
        `);

        // Get overview statistics
        const [[overview]] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'rentee' AND status = 'active') as activeUsers,
                (SELECT COUNT(*) FROM cars WHERE availability_status = 'available') as availableCars,
                (SELECT COUNT(*) FROM bookings) as totalBookings,
                COALESCE((SELECT SUM(total_price) FROM bookings WHERE status != 'cancelled'), 0) as totalRevenue
        `);

        // Add growth metrics to overview
        overview.revenueGrowth = monthlyComparison.revenue_growth;
        overview.bookingGrowth = monthlyComparison.booking_growth;

        // Get revenue by month for the current year
        const [revenueByMonth] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '%b') as month,
                COALESCE(SUM(total_price), 0) as revenue
            FROM bookings
            WHERE 
                status != 'cancelled'
                AND YEAR(created_at) = YEAR(CURRENT_DATE)
            GROUP BY month, MONTH(created_at)
            ORDER BY MONTH(created_at)
        `);

        // Get booking status distribution
        const [bookingsByStatus] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM bookings
            GROUP BY status
        `);

        // Get popular cars with bookings and revenue
        const [popularCars] = await db.query(`
            SELECT 
                CONCAT(c.make, ' ', c.model) as car,
                COUNT(b.id) as bookings,
                COALESCE(SUM(b.total_price), 0) as revenue
            FROM cars c
            LEFT JOIN bookings b ON c.id = b.car_id
            GROUP BY c.id, car
            ORDER BY bookings DESC, revenue DESC
            LIMIT 5
        `);

        res.json({
            overview,
            revenueByMonth,
            bookingsByStatus,
            popularCars
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Error fetching analytics data' });
    }
});

module.exports = router; 