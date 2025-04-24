const db = require('../config/dbConfig');

class Help {
    static async createTable() {
        try {
            // Create FAQs table
            await db.query(`
                CREATE TABLE IF NOT EXISTS faqs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    category VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // Create help guides table
            await db.query(`
                CREATE TABLE IF NOT EXISTS help_guides (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    category VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // Create support tickets table
            await db.query(`
                CREATE TABLE IF NOT EXISTS support_tickets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    subject VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
                    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            
            // Create support ticket messages table
            await db.query(`
                CREATE TABLE IF NOT EXISTS support_ticket_messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ticket_id INT NOT NULL,
                    user_id INT,
                    admin_id INT,
                    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                    message TEXT NOT NULL,
                    attachments JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
                )
            `);

            // Seed initial data
            await this.seedInitialData();

            console.log('Help tables created and seeded successfully');
        } catch (error) {
            console.error('Error creating help tables:', error);
            throw error;
        }
    }

    static async seedInitialData() {
        try {
            // Check if we already have FAQs
            const [faqs] = await db.query('SELECT * FROM faqs LIMIT 1');
            
            if (faqs.length === 0) {
                // Seed initial FAQs
                await db.query(`
                    INSERT INTO faqs (question, answer, category) VALUES
                    ('How do I book a car?', 'To book a car, navigate to the dashboard, select your preferred car, select a time slot, and complete the payment process.', 'Booking'),
                    ('What payment methods are accepted?', 'We accept all major credit and debit cards, as well as PayPal.', 'Payment'),
                    ('How do I cancel a booking?', 'To cancel, go to your bookings page, select the booking you wish to cancel, and click on the cancel button. Cancellation policies apply.', 'Booking'),
                    ('What happens if I return the car late?', 'Late returns are charged at an hourly rate plus a late fee. Please contact support if you anticipate being late.', 'Policies'),
                    ('Do I need insurance?', 'All rentals include basic insurance. You can purchase additional coverage during the booking process.', 'Insurance')
                `);
            }
            
            // Check if we already have guides
            const [guides] = await db.query('SELECT * FROM help_guides LIMIT 1');
            
            if (guides.length === 0) {
                // Seed initial guides
                await db.query(`
                    INSERT INTO help_guides (title, content, category) VALUES
                    ('Complete Booking Guide', 'This comprehensive guide walks you through the entire car booking process from selection to payment confirmation...', 'Booking'),
                    ('Insurance Options Explained', 'Learn about the different insurance coverage options available and which one is right for your needs...', 'Insurance'),
                    ('Troubleshooting Car Issues', 'If you encounter issues with your rental car, follow these steps to diagnose and report problems...', 'Support'),
                    ('Payment Methods and Billing', 'Understand the different payment options, billing cycles, and how to update your payment information...', 'Payment'),
                    ('Membership Benefits Guide', 'Discover all the perks and benefits that come with different membership tiers...', 'Membership')
                `);
            }
            
            // Check if we already have support tickets
            const [tickets] = await db.query('SELECT * FROM support_tickets LIMIT 1');
            
            if (tickets.length === 0) {
                // Get a user ID to associate with tickets
                const [users] = await db.query('SELECT id FROM users WHERE is_admin = 0 LIMIT 1');
                
                if (users.length > 0) {
                    const userId = users[0].id;
                    
                    // Seed initial support tickets
                    await db.query(`
                        INSERT INTO support_tickets (user_id, subject, description, status, priority) VALUES
                        (?, 'Unable to complete booking', 'I keep getting an error when trying to finalize my booking. The error says "Payment processing failed".', 'open', 'high'),
                        (?, 'Car location incorrect', 'The car was not at the location shown in the app. I had to walk 2 blocks to find it.', 'open', 'medium'),
                        (?, 'Refund request for cancelled trip', 'I cancelled my trip due to emergency but haven\'t received a refund yet. Booking #A12345.', 'in_progress', 'medium'),
                        (?, 'Damaged car report', 'The car I rented had a scratch on the passenger door that wasn\'t noted in the app.', 'resolved', 'low'),
                        (?, 'App not working properly', 'The mobile app keeps crashing when I try to view available cars in my area.', 'open', 'high')
                    `, [userId, userId, userId, userId, userId]);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error seeding initial data:', error);
            return false;
        }
    }

    // FAQ Methods
    static async getAllFAQs() {
        try {
            const [rows] = await db.query('SELECT * FROM faqs ORDER BY category, id');
            return rows;
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            throw error;
        }
    }

    static async getFAQsByCategory(category) {
        try {
            const [rows] = await db.query('SELECT * FROM faqs WHERE category = ?', [category]);
            return rows;
        } catch (error) {
            console.error('Error fetching FAQs by category:', error);
            throw error;
        }
    }

    // Help Guide Methods
    static async getAllGuides() {
        try {
            const [rows] = await db.query('SELECT * FROM help_guides ORDER BY category, title');
            return rows;
        } catch (error) {
            console.error('Error fetching guides:', error);
            throw error;
        }
    }

    static async getGuidesByCategory(category) {
        try {
            const [rows] = await db.query('SELECT * FROM help_guides WHERE category = ?', [category]);
            return rows;
        } catch (error) {
            console.error('Error fetching guides by category:', error);
            throw error;
        }
    }

    // Support Ticket Methods
    static async createSupportTicket(ticketData) {
        try {
            const { user_id, subject, description, priority } = ticketData;
            const [result] = await db.query(
                'INSERT INTO support_tickets (user_id, subject, description, priority) VALUES (?, ?, ?, ?)',
                [user_id, subject, description, priority]
            );
            return { id: result.insertId, ...ticketData };
        } catch (error) {
            console.error('Error creating support ticket:', error);
            throw error;
        }
    }

    static async getUserTickets(userId) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching user tickets:', error);
            throw error;
        }
    }

    static async updateTicketStatus(ticketId, status) {
        try {
            await db.query(
                'UPDATE support_tickets SET status = ? WHERE id = ?',
                [status, ticketId]
            );
            return true;
        } catch (error) {
            console.error('Error updating ticket status:', error);
            throw error;
        }
    }
}

module.exports = Help; 