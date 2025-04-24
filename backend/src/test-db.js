const db = require('./config/dbConfig');

async function testDatabaseConnection() {
    try {
        // Test database connection
        console.log('Testing database connection...');
        await db.query('SELECT 1');
        console.log('Database connection successful!');

        // Check FAQs table
        console.log('\nChecking FAQs table...');
        const [faqs] = await db.query('SELECT * FROM faqs');
        console.log(`Found ${faqs.length} FAQs`);

        // Check help_guides table
        console.log('\nChecking help_guides table...');
        const [guides] = await db.query('SELECT * FROM help_guides');
        console.log(`Found ${guides.length} guides`);

        // Check support_tickets table
        console.log('\nChecking support_tickets table...');
        const [tickets] = await db.query('SELECT * FROM support_tickets');
        console.log(`Found ${tickets.length} tickets`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testDatabaseConnection(); 