require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const runSeed = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        await client.connect();

        // Ensure table exists
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schema);

        console.log('Schema executed successfully.');

        // Get products from JS file
        const productsFilePath = path.join(__dirname, '../frontend/src/products.js');
        const productsFileContent = fs.readFileSync(productsFilePath, 'utf8');
        
        const match = productsFileContent.match(/export const PRODUCTS = (\[.*\]);?\s*$/s);
        if (!match) throw new Error('Could not parse products.js');
        const products = JSON.parse(match[1]);

        console.log(`Found ${products.length} products to insert.`);

        // Clear existing products
        await client.query('TRUNCATE TABLE products RESTART IDENTITY');

        let inserted = 0;
        for (const p of products) {
            await client.query(
                `INSERT INTO products (name, wt, cat, route, ppk, sfnf, upper, sm, sell, mrp) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    p.name, 
                    p.wt ? p.wt.toString() : null, 
                    p.cat, 
                    p.route, 
                    p.ppk, 
                    p.sfnf, 
                    p.upper, 
                    p.sm, 
                    p.sell, 
                    p.mrp
                ]
            );
            inserted++;
        }

        console.log(`Successfully seeded ${inserted} products.`);
    } catch (err) {
        console.error('Error during seeding:', err);
    } finally {
        await client.end();
    }
};

runSeed();
