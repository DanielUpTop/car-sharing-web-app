// Script to insert sample chat and support ticket data

// Load environment variables
require('dotenv').config();

// Import the sample data insertion function
const insertSampleData = require('../database/sampleData');

// Run the function
console.log('Starting sample chat and support ticket data insertion...');
insertSampleData()
    .then(() => {
        console.log('Sample data insertion completed successfully.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error during sample data insertion:', err);
        process.exit(1);
    }); 