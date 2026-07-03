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

    // Add new columns to invoices table if they don't exist
    await db.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'PO';
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_name TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_address TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_mob TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_gst TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS seller_pan TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_name TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_address TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_mob TEXT;
    `);
    console.log('Added custom info columns and invoice_type to invoices table');

    // Update the check constraint to include 'cancelled'
    await db.query(`
      ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
      ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'));
    `);
    console.log('Updated invoices_status_check constraint to include cancelled');

    // Populate existing blank rows with default data based on route
    const companyData = {
      SADVIK: {
        sellerName: 'SHREE SADVIK PERFUMERY WORKS',
        sellerAddress: 'Sai Nagar Society, A-Wing, Ground Floor, Room No. 1, Near Shivam Building, Vitawa, Thane - 400605.',
        sellerMob: '9930300069 / 9833540041',
        sellerGst: 'N/A',
        sellerPan: 'N/A',
        buyerName: 'M/S. Sugandh Mart (Online)',
        buyerAddress: 'Shop No 10, Dedhia Avenue, Near Mulund Station, RRT Road - Ganesh Gawde Road Junction, Mulund West, Mumbai 400080.',
        buyerMob: '9867091077',
        buyerGst: '27BTKPP0365H1ZG'
      },
      ALEITR: {
        sellerName: 'AL-EITR',
        sellerAddress: 'C2-Wing, Shop No. 12, Ashar Estate, Shree Nagar, Wagle Estate, Thane - 400604.',
        sellerMob: '9833540041',
        sellerGst: '27ABWFA9136E1Z1',
        sellerPan: 'ABWFA9136E',
        buyerName: 'M/S. Sugandh Mart 1',
        buyerAddress: 'Swargandha CHS, Shop No. 8, Ground Floor, Shree Nagar, Wagle Estate, Thane - 400604.',
        buyerMob: '9987261467',
        buyerGst: '27BTKPP0365H1ZG'
      },
      SIPL: {
        sellerName: 'SVAR INTERNATIONAL PRIVATE LIMITED',
        sellerAddress: 'Plot No. C-6, Phase-I, MIDC, Golavli, Kalyan Shill Phatta Road, Dombivali East, Thane - 421203.',
        sellerMob: '8879942929',
        sellerGst: '27AARCS9672G1ZJ',
        sellerPan: 'AARCS9672G',
        buyerName: 'M/S. AL-EITR',
        buyerAddress: '610, Runwal R-Square, L.B.S. Marg, Mulund (W), Mumbai - 400080.',
        buyerMob: '9833540041',
        buyerGst: '27ABWFA9136E1Z1'
      },
      SFNF: {
        sellerName: 'SVAR FRAGRANCES & FLAVORS PRIVATE LIMITED',
        sellerAddress: 'Plot No. C-6, Phase-I, MIDC, Golavli, Kalyan Shill Phatta Road, Dombivali East, Thane - 421203.',
        sellerMob: '8879942929',
        sellerGst: '27AAUCS5058F1ZU',
        sellerPan: 'AAUCS5058F',
        buyerName: 'M/S. Svar International Pvt Ltd',
        buyerAddress: '610, Runwal R-Square, L.B.S. Marg, Mulund (West), Mumbai - 400080.',
        buyerMob: '8879942929',
        buyerGst: '27AARCS9672G1ZJ'
      }
    };

    const COMPANY_NAMES = {
      SFNF: 'Svar Fragrances & Flavors (SFNF)',
      SIPL: 'Svar International Pvt Ltd (SIPL)',
      SADVIK: 'Shree Sadvik Perfumery Works (Sadvik)',
      ALEITR: 'Al Eitr',
      SM: 'Sugandh Mart (SM)'
    };

    // Update existing rows
    const invoicesRes = await db.query(`SELECT id, from_entity, to_entity FROM invoices WHERE seller_name IS NULL`);
    console.log(`Found ${invoicesRes.rows.length} existing blank invoices to migrate`);
    for (const inv of invoicesRes.rows) {
      const cd = companyData[inv.from_entity] || {
        sellerName: COMPANY_NAMES[inv.from_entity] || inv.from_entity,
        sellerAddress: '-',
        sellerMob: '-',
        sellerGst: '-',
        sellerPan: '-',
        buyerName: COMPANY_NAMES[inv.to_entity] || inv.to_entity,
        buyerAddress: '-',
        buyerMob: '-',
        buyerGst: '-'
      };
      await db.query(`
        UPDATE invoices
        SET seller_name = $1, seller_address = $2, seller_mob = $3, seller_gst = $4, seller_pan = $5,
            buyer_name = $6, buyer_address = $7, buyer_mob = $8, buyer_gst = $9,
            invoice_type = 'TAX' -- existing ones are historical TAX invoices
        WHERE id = $10
      `, [
        cd.sellerName, cd.sellerAddress, cd.sellerMob, cd.sellerGst, cd.sellerPan,
        cd.buyerName, cd.buyerAddress, cd.buyerMob, cd.buyerGst,
        inv.id
      ]);
    }
    console.log('Existing invoices migration complete.');

    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
