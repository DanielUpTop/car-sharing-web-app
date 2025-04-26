const fs = require('fs');
const path = require('path');
const db = require('../config/dbConfig');

async function setupHelpTables() {
    try {
        console.log('Setting up help tables...');
        
        // Read SQL file
        const sqlFilePath = path.join(__dirname, 'help_tables.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Split SQL file into separate statements
        const statements = sql
            .replace(/(\r\n|\n|\r)/gm, ' ') // Replace newlines with spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
            .split(';') // Split on semicolons
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0); // Remove empty statements
        
        // Execute each statement
        for (const statement of statements) {
            await db.query(statement);
            console.log('Executed:', statement.substring(0, 50) + '...');
        }
        
        console.log('Help tables setup complete!');
    } catch (error) {
        console.error('Error setting up help tables:', error);
    } finally {
        process.exit();
    }
}

setupHelpTables(); 