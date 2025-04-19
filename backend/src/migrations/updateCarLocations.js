require('dotenv').config({ path: 'backend/.env' });
const mysql = require('mysql2/promise');

async function updateCarLocations() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const carLocations = [
        {
            make: 'Mini',
            model: 'Electric',
            address: '123 Oxford Street, London W1D 1DF',
            location: 'Central London',
            latitude: 51.5152,
            longitude: -0.1454
        },
        {
            make: 'Toyota',
            model: 'RAV4',
            address: '45 Baker Street, London NW1 6XE',
            location: 'North London',
            latitude: 51.5187,
            longitude: -0.1557
        },
        {
            make: 'Toyota',
            model: 'Prius',
            address: '78 Kensington High Street, London W8 5SE',
            location: 'West London',
            latitude: 51.5007,
            longitude: -0.1924
        },
        {
            make: 'Mercedes-Benz',
            model: 'EQC',
            address: '15 Sloane Square, London SW1W 8EG',
            location: 'Chelsea',
            latitude: 51.4929,
            longitude: -0.1570
        },
        {
            make: 'Lexus',
            model: 'NX450h+',
            address: '234 Kings Road, London SW3 5UB',
            location: 'Chelsea',
            latitude: 51.4847,
            longitude: -0.1665
        }
    ];

    try {
        console.log('Starting car location updates...');
        
        for (const car of carLocations) {
            const query = `
                UPDATE cars 
                SET address = ?,
                    location = ?,
                    latitude = ?,
                    longitude = ?
                WHERE make = ? AND model = ?
            `;
            
            const [result] = await connection.execute(query, [
                car.address,
                car.location,
                car.latitude,
                car.longitude,
                car.make,
                car.model
            ]);
            
            console.log(`Updated location for ${car.make} ${car.model}: ${result.affectedRows} row(s) affected`);
        }
        
        console.log('All car locations updated successfully');
    } catch (error) {
        console.error('Error updating car locations:', error);
    } finally {
        await connection.end();
    }
}

// Run the migration
console.log('Connecting to database...');
updateCarLocations().catch(console.error); 