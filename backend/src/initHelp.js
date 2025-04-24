const Help = require('./models/helpModel');

async function initializeHelpSystem() {
    try {
        console.log('Initializing help system...');
        await Help.createTable();
        console.log('Help system initialized successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing help system:', error);
        process.exit(1);
    }
}

initializeHelpSystem(); 