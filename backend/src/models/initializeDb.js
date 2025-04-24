const User = require('./userModel');
const Car = require('./carModel');
const Booking = require('./bookingModel');
const Insurance = require('./insuranceModel');
const Help = require('./helpModel');
const db = require('../config/dbConfig');

const initializeDatabase = async () => {
    try {
        console.log('Starting database initialization...');
        
        // Create tables
        await User.createTable();
        console.log('Users table created/verified');
        
        await Car.createTable();
        console.log('Cars table created/verified');
        
        await Booking.createTable();
        console.log('Bookings table created/verified');
        
        await Insurance.createTable();
        console.log('Insurance tables created/verified');

        await Help.createTable();
        console.log('Help tables created/verified');

        // Insert some default FAQs and guides if they don't exist
        const [existingFaqs] = await db.query('SELECT * FROM faqs LIMIT 1');
        if (existingFaqs.length === 0) {
            const faqs = [
                {
                    question: 'How do I book a car?',
                    answer: 'To book a car, browse available vehicles on the dashboard, select your desired car, choose your rental dates and time, and complete the booking process. You can view all your bookings in the "My Bookings" section.',
                    category: 'booking'
                },
                {
                    question: 'What happens if I need to cancel my booking?',
                    answer: 'You can cancel your booking through the "My Bookings" section. Cancellation policies vary based on your membership level.',
                    category: 'booking'
                },
                {
                    question: 'How does the insurance coverage work?',
                    answer: 'We offer different levels of insurance coverage based on your membership tier. Basic members get standard coverage, while Premium and Platinum members receive enhanced and premium coverage respectively.',
                    category: 'insurance'
                },
                {
                    question: 'What should I do in case of an accident?',
                    answer: '1. Ensure everyone\'s safety and call emergency services if needed. 2. Document the incident with photos. 3. Contact our 24/7 support line. 4. File an insurance claim through the Insurance section. 5. Our team will guide you through the process.',
                    category: 'emergency'
                },
                {
                    question: 'How do I upgrade my membership?',
                    answer: 'You can upgrade your membership through the Membership section in your dashboard. Choose from our Basic, Premium, or Platinum tiers to enjoy enhanced benefits.',
                    category: 'membership'
                }
            ];

            for (const faq of faqs) {
                await db.query(
                    'INSERT INTO faqs (question, answer, category) VALUES (?, ?, ?)',
                    [faq.question, faq.answer, faq.category]
                );
            }
            console.log('Default FAQs inserted');
        }

        const [existingGuides] = await db.query('SELECT * FROM help_guides LIMIT 1');
        if (existingGuides.length === 0) {
            const guides = [
                {
                    title: 'Getting Started Guide',
                    content: 'Learn the basics of using our car sharing service. This guide covers account setup, browsing cars, and making your first booking.',
                    category: 'general'
                },
                {
                    title: 'Booking Process',
                    content: 'Step-by-step guide to booking a car, including how to select dates, choose insurance coverage, and complete payment.',
                    category: 'booking'
                },
                {
                    title: 'Insurance Guide',
                    content: 'Understanding your insurance coverage options, what\'s included, and how to file a claim if needed.',
                    category: 'insurance'
                }
            ];

            for (const guide of guides) {
                await db.query(
                    'INSERT INTO help_guides (title, content, category) VALUES (?, ?, ?)',
                    [guide.title, guide.content, guide.category]
                );
            }
            console.log('Default help guides inserted');
        }

        console.log('All database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

// Execute if this file is run directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('Database initialization completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Database initialization failed:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase; 