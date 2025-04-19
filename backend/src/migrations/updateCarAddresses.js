require('dotenv').config({ path: 'backend/.env' });
const db = require('../config/dbConfig');

const carAddresses = [
    {
        make: 'Mini',
        model: 'Electric',
        address: '123 Oxford Street, London W1D 1DF'
    },
    {
        make: 'Toyota',
        model: 'RAV4',
        address: '45 Baker Street, London NW1 6XE'
    },
    {
        make: 'Toyota',
        model: 'Prius',
        address: '78 Kensington High Street, London W8 5SE'
    },
    {
        make: 'Mercedes-Benz',
        model: 'EQC',
        address: '15 Sloane Square, London SW1W 8EG'
    },
    {
        make: 'Lexus',
        model: 'NX450h+',
        address: '234 Kings Road, London SW3 5UB'
    }
];

async function updateCarAddresses() {
    try {
        console.log('Starting car address updates...');
        for (const car of carAddresses) {
            const query = `
                UPDATE cars 
                SET address = ?
                WHERE make = ? AND model = ?
            `;
            await db.query(query, [car.address, car.make, car.model]);
            console.log(`Updated address for ${car.make} ${car.model}`);
        }
        console.log('All car addresses updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating car addresses:', error);
        process.exit(1);
    }
}

// Run the migration
console.log('Connecting to database...');
updateCarAddresses(); 