const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendInvoiceEmail } = require('../mailer');
const { companyData, COMPANY_NAMES } = require('../pdfGenerator');

// Map entities to their configured environment variable email addresses
const getEntityEmail = (entity) => {
  const emailMap = {
    SFNF: process.env.EMAIL_SFNF,
    SIPL: process.env.EMAIL_SIPL,
    SADVIK: process.env.EMAIL_SADVIK,
    ALEITR: process.env.EMAIL_ALEITR,
    SM: process.env.EMAIL_SM
  };
  return emailMap[entity];
};

router.post('/bill', async (req, res) => {
  const { store, date, customer_total, gst_on, invoices } = req.body;
  console.log('Received /bill payload with invoices count:', invoices ? invoices.length : 0);

  if (!store || !date || customer_total === undefined || gst_on === undefined || !Array.isArray(invoices)) {
    return res.status(400).json({ error: 'Invalid payload. Missing store, date, customer_total, gst_on, or invoices array.' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert top-level sale info into the sales table
    const saleResult = await client.query(
      'INSERT INTO sales (store, date, customer_total, gst_on) VALUES ($1, $2, $3, $4) RETURNING id',
      [store, date, customer_total, gst_on]
    );

    const saleId = saleResult.rows[0].id;

    // 2. Loop through each invoice, insert into the database, and send the email
    for (const inv of invoices) {
      const { from_entity, to_entity, amount, gst, grand_total } = inv;
      
      const recipientEmail = getEntityEmail(to_entity);
      if (!recipientEmail) {
        throw new Error(`Email address not configured for entity: ${to_entity}. Please update your system configurations.`);
      }

      const generatedInvoiceNumber = `PENDING-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const cd = companyData[from_entity] || {
        sellerName: COMPANY_NAMES[from_entity] || from_entity,
        sellerAddress: '-',
        sellerMob: '-',
        sellerGst: '-',
        sellerPan: '-',
        buyerName: COMPANY_NAMES[to_entity] || to_entity,
        buyerAddress: '-',
        buyerMob: '-',
        buyerGst: '-'
      };

      // Insert invoice record into database to generate the UUID token
      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          sale_id, from_entity, to_entity, invoice_number, amount, gst, grand_total, status,
          invoice_type, seller_name, seller_address, seller_mob, seller_gst, seller_pan,
          buyer_name, buyer_address, buyer_mob, buyer_gst
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
         RETURNING token, id, from_entity, to_entity, invoice_number, grand_total`,
        [
          saleId, from_entity, to_entity, generatedInvoiceNumber, amount, gst, grand_total, 'pending',
          'PO', cd.sellerName, cd.sellerAddress, cd.sellerMob, cd.sellerGst, cd.sellerPan,
          cd.buyerName, cd.buyerAddress, cd.buyerMob, cd.buyerGst
        ]
      );

      const dbInvoice = invoiceResult.rows[0];

      // Insert line items
      if (inv.items && Array.isArray(inv.items)) {
        for (const item of inv.items) {
          await client.query(
            `INSERT INTO invoice_items (invoice_id, product_name, category, weight, qty, rate, total, hsn)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              dbInvoice.id,
              item.name,
              item.cat,
              item.wt ? item.wt.toString() : null,
              item.qty,
              item.rate,
              item.total,
              inv.hsn || null
            ]
          );
        }
      }



      // Prepare email URLs using base URL and the secure token
      // Note: We do NOT print the token in these console logs to maintain confidentiality
      let baseUrl = process.env.BASE_URL;
      const reqOrigin = req.headers.origin;
      const reqHost = req.headers['x-forwarded-host'] || req.get('host');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      
      if (reqOrigin && !reqOrigin.includes('localhost')) {
        baseUrl = reqOrigin;
      } else if (reqHost && !reqHost.includes('localhost')) {
        baseUrl = `${protocol}://${reqHost}`;
      }

      const acceptUrl = `${baseUrl}/invoice/accept?token=${dbInvoice.token}`;
      const rejectUrl = `${baseUrl}/invoice/reject?token=${dbInvoice.token}`;

      console.log(`Firing off invoice email for ${generatedInvoiceNumber} to ${to_entity} (${recipientEmail})...`);
      
      try {
        await sendInvoiceEmail(recipientEmail, dbInvoice, acceptUrl, rejectUrl);
      } catch (mailError) {
        console.error(`Email Error: Failed to send email for invoice ${generatedInvoiceNumber}`, mailError);
        throw new Error(`Failed to send email for invoice ${generatedInvoiceNumber}: ${mailError.message}`);
      }

      // Update emailed_at timestamp in database on successful email delivery
      await client.query(
        'UPDATE invoices SET emailed_at = $1 WHERE id = $2',
        [new Date().toISOString(), dbInvoice.id]
      );
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Sale and linked invoices processed successfully.' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction Error in /bill endpoint:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
