const db = require('../config/database');

// Sample data insertion script
async function insertSampleData() {
    try {
        console.log('Starting sample data insertion...');
        
        // First check if we already have sample data
        try {
            const [existingConversations] = await db.query('SELECT COUNT(*) as count FROM conversations');
            if (existingConversations[0].count > 0) {
                console.log('Sample data already exists. Skipping...');
                return;
            }
        } catch (err) {
            console.log('Could not check for existing conversations:', err.message);
            console.log('Creating tables first...');
            
            // Create tables if they don't exist
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS conversations (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        subject VARCHAR(255),
                        status ENUM('open', 'closed', 'archived') DEFAULT 'open',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `);
                
                await db.query(`
                    CREATE TABLE IF NOT EXISTS messages (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        conversation_id INT NOT NULL,
                        sender_id INT NOT NULL,
                        content TEXT NOT NULL,
                        is_read BOOLEAN DEFAULT false,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `);
                
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
                
                console.log('Chat and ticket tables created successfully');
            } catch (tableErr) {
                console.log('Error creating required tables:', tableErr.message);
                return;
            }
        }

        // Get admin user ID
        const [adminUser] = await db.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
        if (!adminUser.length) {
            console.log('Admin user not found. Skipping sample data insertion.');
            return;
        }
        const adminId = adminUser[0].id;

        // Get all regular users
        const [users] = await db.query('SELECT id FROM users WHERE role = "rentee"');
        if (!users.length) {
            console.log('No regular users found. Skipping sample data insertion.');
            return;
        }

        // Insert sample conversations and messages
        for (const user of users) {
            // Create a couple of conversations for each user
            try {
                const [openConvResult] = await db.query(
                    'INSERT INTO conversations (user_id, subject, status) VALUES (?, ?, ?)',
                    [user.id, 'Booking assistance', 'open']
                );
                const openConvId = openConvResult.insertId;

                const [closedConvResult] = await db.query(
                    'INSERT INTO conversations (user_id, subject, status) VALUES (?, ?, ?)',
                    [user.id, 'Technical support', 'closed']
                );
                const closedConvId = closedConvResult.insertId;

                // Add messages to the open conversation
                const openMessages = [
                    { sender_id: user.id, content: "Hello, I need help with my booking." },
                    { sender_id: adminId, content: "Hi there! How can I assist you with your booking today?" },
                    { sender_id: user.id, content: "I'm trying to extend my current booking by 2 more days" },
                    { sender_id: adminId, content: "I'd be happy to help with that. Let me check what options are available." },
                    { sender_id: adminId, content: "I can confirm that the car is available for the extended period. Would you like me to make those changes for you?" },
                    { sender_id: user.id, content: "Yes please, that would be great!" }
                ];

                for (const msg of openMessages) {
                    await db.query(
                        'INSERT INTO messages (conversation_id, sender_id, content, is_read) VALUES (?, ?, ?, ?)',
                        [openConvId, msg.sender_id, msg.content, msg.sender_id === adminId]
                    );
                    // Add some delay to get different created_at times
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                // Add messages to the closed conversation
                const closedMessages = [
                    { sender_id: user.id, content: "The app is showing an error when I try to view my bookings" },
                    { sender_id: adminId, content: "I'm sorry to hear that. Could you describe the error message?" },
                    { sender_id: user.id, content: "It says 'Unable to load bookings at this time'" },
                    { sender_id: adminId, content: "Thanks for that information. Let me look into it right away." },
                    { sender_id: adminId, content: "The issue has been resolved. Could you please try accessing your bookings now?" },
                    { sender_id: user.id, content: "Yes, it's working now. Thank you!" },
                    { sender_id: adminId, content: "You're welcome! Is there anything else I can help with?" },
                    { sender_id: user.id, content: "No, that's all. Thanks again." }
                ];

                for (const msg of closedMessages) {
                    await db.query(
                        'INSERT INTO messages (conversation_id, sender_id, content, is_read) VALUES (?, ?, ?, ?)',
                        [closedConvId, msg.sender_id, msg.content, true]
                    );
                    // Add some delay to get different created_at times
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                // Update conversation timestamps to make some older
                await db.query(
                    'UPDATE conversations SET created_at = DATE_SUB(NOW(), INTERVAL ? DAY), updated_at = DATE_SUB(NOW(), INTERVAL ? DAY) WHERE id = ?',
                    [Math.floor(Math.random() * 30), Math.floor(Math.random() * 15), closedConvId]
                );
            } catch (err) {
                console.log(`Error creating conversations for user ${user.id}:`, err.message);
                // Continue with next user
            }
        }

        // Insert sample support tickets
        const ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        const ticketPriorities = ['low', 'medium', 'high', 'urgent'];
        const ticketSubjects = [
            'Cannot access my account',
            'Payment failed but money was deducted',
            'Car location shown incorrectly on the map',
            'Need to cancel my booking',
            'App crashing on login',
            'Incorrect billing amount',
            'Request for refund',
            'Car damage report',
            'Issue with extending booking',
            'Unable to view receipts'
        ];

        for (const user of users) {
            try {
                // Create 1-3 tickets per user
                const numTickets = Math.floor(Math.random() * 3) + 1;
                
                for (let i = 0; i < numTickets; i++) {
                    const subject = ticketSubjects[Math.floor(Math.random() * ticketSubjects.length)];
                    const status = ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)];
                    const priority = ticketPriorities[Math.floor(Math.random() * ticketPriorities.length)];
                    const daysAgo = Math.floor(Math.random() * 30);
                    
                    const description = `I'm experiencing an issue with ${subject.toLowerCase()}. Please help resolve this as soon as possible.`;
                    
                    await db.query(
                        `INSERT INTO support_tickets 
                        (user_id, subject, description, status, priority, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), DATE_SUB(NOW(), INTERVAL ? DAY))`,
                        [user.id, subject, description, status, priority, daysAgo, Math.max(0, daysAgo - Math.floor(Math.random() * 5))]
                    );
                }
            } catch (err) {
                console.log(`Error creating tickets for user ${user.id}:`, err.message);
                // Continue with next user
            }
        }

        console.log('Sample data inserted successfully!');
    } catch (error) {
        console.error('Error inserting sample data:', error);
    }
}

// Run this script directly or expose it as a function
if (require.main === module) {
    // Direct execution
    insertSampleData()
        .then(() => {
            console.log('Sample data script completed.');
            process.exit(0);
        })
        .catch(err => {
            console.error('Error in sample data script:', err);
            process.exit(1);
        });
} else {
    // Imported as a module
    module.exports = insertSampleData;
} 