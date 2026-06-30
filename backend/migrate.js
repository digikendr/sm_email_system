const db = require('./db');

async function migrate() {
  try {
    console.log('Running migration...');
    
    // Add pdf_url column to invoices if it doesn't exist
    await db.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
    `);
    console.log('Added pdf_url column to invoices');

    // Create invoice_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id BIGSERIAL PRIMARY KEY,
        invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        category TEXT NOT NULL,
        weight TEXT,
        qty NUMERIC NOT NULL,
        rate NUMERIC NOT NULL,
        total NUMERIC NOT NULL,
        hsn TEXT
      );
    `);
    console.log('Created invoice_items table');
    
    // Create reports table
    await db.query(`
      CREATE TABLE IF NOT EXISTS reports (
          id BIGSERIAL PRIMARY KEY,
          report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
          report_date DATE NOT NULL,
          file_path TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reports_type_date ON reports(report_type, report_date);`);
    console.log('Created reports table');

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
