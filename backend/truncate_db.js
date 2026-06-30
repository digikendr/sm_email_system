const pool = require('./db');

async function truncateDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Truncating sales will cascade to invoices and invoice_items
    console.log('Truncating sales, invoices, and invoice_items...');
    await client.query('TRUNCATE TABLE sales RESTART IDENTITY CASCADE');
    
    await client.query('COMMIT');
    console.log('Successfully cleared all invoices and bills.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to truncate tables:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

truncateDB();
