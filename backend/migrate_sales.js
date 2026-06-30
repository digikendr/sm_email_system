const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add status column
    await client.query(`
      ALTER TABLE sales 
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
    `);
    
    // Add checked_items column
    await client.query(`
      ALTER TABLE sales 
      ADD COLUMN IF NOT EXISTS checked_items JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
    
    await client.query('COMMIT');
    console.log('Successfully migrated sales table');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
