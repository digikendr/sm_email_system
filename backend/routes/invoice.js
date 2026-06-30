const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuthHTML } = require('../middleware/auth');

// Helper to replace placeholders inside HTML templates
function renderTemplate(fileName, data) {
  const filePath = path.join(__dirname, '../views', fileName);
  let html = fs.readFileSync(filePath, 'utf8');
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`<%= ${key} %>`, 'g'), value);
  }
  return html;
}

const getPrefix = (from_entity) => {
  const prefixMap = {
    SADVIK: 'SSPW',
    ALEITR: 'AL',
    SIPL: 'SIPL',
    SFNF: 'SFFPL'
  };
  return prefixMap[from_entity] || 'INV';
};

// Shared validation helper to lookup and validate invoice by token
async function getValidatedInvoice(token) {
  const result = await db.query('SELECT * FROM invoices WHERE token = $1', [token]);
  const invoice = result.rows[0];

  if (!invoice) {
    throw new Error('Invoice not found.');
  }

  if (invoice.status !== 'pending') {
    throw new Error(`Invoice has already been ${invoice.status}.`);
  }

  if (!invoice.emailed_at) {
    throw new Error('Invoice has not been sent via email yet.');
  }

  const emailedAt = new Date(invoice.emailed_at);
  const now = new Date();
  const timeDiff = now.getTime() - emailedAt.getTime();
  const daysDiff = timeDiff / (1000 * 3600 * 24);

  if (daysDiff > 7) {
    throw new Error('This transaction link has expired (links are valid for 7 days only).');
  }

  return invoice;
}

// GET /invoice/accept?token=
router.get('/invoice/accept', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('<h1>Bad Request</h1><p>Missing security token.</p>');
  }

  try {
    const invoice = await getValidatedInvoice(token);

    const prefix = getPrefix(invoice.from_entity);
    const html = renderTemplate('confirm_action.html', {
      action: 'accept',
      action_capitalized: 'Accept',
      token,
      prompt_text: 'Please assign an invoice number for this transaction before you',
      input_block: `<div class="input-group">
        <div class="prefix-box">${prefix}</div>
        <input type="text" name="invoice_number_suffix" required placeholder="00000" autocomplete="off" style="width: 150px;">
        <input type="hidden" name="prefix" value="${prefix}">
      </div>`,
      error_block: '',
      from_entity: invoice.from_entity,
      to_entity: invoice.to_entity,
      grand_total: new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.grand_total)
    });

    return res.status(200).send(html);

  } catch (err) {
    console.error('Invoice accept process failed (token not logged for security).');
    return res.status(400).send(`<h1>Verification Failed</h1><p>${err.message}</p>`);
  }
});

// POST /invoice/accept?token=
router.post('/invoice/accept', async (req, res) => {
  const { token } = req.query;
  const { invoice_number_suffix, prefix } = req.body;

  if (!token) {
    return res.status(400).send('<h1>Bad Request</h1><p>Missing security token.</p>');
  }

  try {
    const invoice = await getValidatedInvoice(token);
    
    if (!invoice_number_suffix || invoice_number_suffix.trim() === '') {
      const formPrefix = prefix || getPrefix(invoice.from_entity);
      const html = renderTemplate('confirm_action.html', {
        action: 'accept',
        action_capitalized: 'Accept',
        token,
        prompt_text: 'Please assign an invoice number for this transaction before you',
        input_block: `<div class="input-group">
          <div class="prefix-box">${formPrefix}</div>
          <input type="text" name="invoice_number_suffix" required placeholder="00000" autocomplete="off" style="width: 150px;">
          <input type="hidden" name="prefix" value="${formPrefix}">
        </div>`,
        error_block: '<div class="error-msg">Invoice number is required.</div>',
        from_entity: invoice.from_entity,
        to_entity: invoice.to_entity,
        grand_total: new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.grand_total)
      });
      return res.status(400).send(html);
    }

    const assignedNumber = `${prefix}${invoice_number_suffix.trim()}`;

    await db.query(
      'UPDATE invoices SET invoice_number = $1, status = $2, accepted_at = $3 WHERE id = $4',
      [assignedNumber, 'accepted', new Date().toISOString(), invoice.id]
    );

    const html = renderTemplate('accepted.html', {
      invoice_number: assignedNumber,
      from_entity: invoice.from_entity,
      to_entity: invoice.to_entity,
      grand_total: new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.grand_total)
    });

    return res.status(200).send(html);

  } catch (err) {
    console.error('Invoice accept process failed (token not logged for security).');
    return res.status(400).send(`<h1>Verification Failed</h1><p>${err.message}</p>`);
  }
});

// GET /invoice/reject?token=
router.get('/invoice/reject', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('<h1>Bad Request</h1><p>Missing security token.</p>');
  }

  try {
    const invoice = await getValidatedInvoice(token);

    const html = renderTemplate('confirm_action.html', {
      action: 'reject',
      action_capitalized: 'Reject',
      token,
      prompt_text: 'Please click below to confirm that you want to',
      input_block: '',
      error_block: '',
      from_entity: invoice.from_entity,
      to_entity: invoice.to_entity,
      grand_total: new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.grand_total)
    });

    return res.status(200).send(html);

  } catch (err) {
    console.error('Invoice reject process failed (token not logged for security).');
    return res.status(400).send(`<h1>Verification Failed</h1><p>${err.message}</p>`);
  }
});

// POST /invoice/reject?token=
router.post('/invoice/reject', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('<h1>Bad Request</h1><p>Missing security token.</p>');
  }

  try {
    const invoice = await getValidatedInvoice(token);

    await db.query(
      'UPDATE invoices SET status = $1, rejected_at = $2 WHERE id = $3',
      ['rejected', new Date().toISOString(), invoice.id]
    );

    const html = renderTemplate('rejected.html', {
      invoice_number: 'N/A',
      from_entity: invoice.from_entity,
      to_entity: invoice.to_entity,
      grand_total: new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.grand_total)
    });

    return res.status(200).send(html);

  } catch (err) {
    console.error('Invoice reject process failed (token not logged for security).');
    return res.status(400).send(`<h1>Verification Failed</h1><p>${err.message}</p>`);
  }
});

const { generateInvoicePDF } = require('../pdfGenerator');

// GET /invoice/:invoice_number/pdf
router.get('/invoice/:invoice_number/pdf', requireAuthHTML, async (req, res) => {
  const { invoice_number } = req.params;
  
  try {
    const query = `
      SELECT 
        i.*,
        s.store,
        s.date,
        COALESCE(json_agg(item.*) FILTER (WHERE item.id IS NOT NULL), '[]') as items
      FROM invoices i
      JOIN sales s ON s.id = i.sale_id
      LEFT JOIN invoice_items item ON item.invoice_id = i.id
      WHERE i.invoice_number = $1
      GROUP BY i.id, s.store, s.date
    `;
    
    const result = await db.query(query, [invoice_number]);
    if (result.rows.length === 0) {
      return res.status(404).send('Invoice not found');
    }
    
    const dbData = result.rows[0];
    
    // Structure the data as expected by the PDF generator
    const invPayload = {
      invoice_number: dbData.invoice_number,
      from_entity: dbData.from_entity,
      to_entity: dbData.to_entity,
      amount: dbData.amount,
      gst: dbData.gst,
      grand_total: dbData.grand_total,
      hsn: dbData.items.length > 0 ? dbData.items[0].hsn : 'N/A',
      items: dbData.items.map(item => ({
        name: item.product_name,
        cat: item.category,
        wt: item.weight,
        qty: item.qty,
        rate: item.rate,
        total: item.total
      }))
    };
    
    const pdfBuffer = await generateInvoicePDF(invPayload, dbData.store, dbData.date);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice_number}.pdf"`);
    return res.send(pdfBuffer);
    
  } catch (err) {
    console.error('Failed to generate PDF on the fly:', err);
    return res.status(500).send('Internal Server Error generating PDF');
  }
});

module.exports = router;
