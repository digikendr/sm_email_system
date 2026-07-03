const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { generateReportPDF } = require('../reportGenerator');
const { getReportAnalytics } = require('../reportAnalytics');
const ExcelJS = require('exceljs');


// Helper to format currency
const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

// Helper to format date
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ' ' + d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

router.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT s.*, COALESCE(
        json_agg(
          json_build_object(
            'id', i.id,
            'sale_id', i.sale_id,
            'from_entity', i.from_entity,
            'to_entity', i.to_entity,
            'invoice_number', i.invoice_number,
            'amount', i.amount,
            'gst', i.gst,
            'grand_total', i.grand_total,
            'token', i.token,
            'status', i.status,
            'emailed_at', i.emailed_at,
            'accepted_at', i.accepted_at,
            'rejected_at', i.rejected_at,
            'pdf_url', i.pdf_url,
            'invoice_type', i.invoice_type,
            'seller_name', i.seller_name,
            'seller_address', i.seller_address,
            'seller_mob', i.seller_mob,
            'seller_gst', i.seller_gst,
            'seller_pan', i.seller_pan,
            'buyer_name', i.buyer_name,
            'buyer_address', i.buyer_address,
            'buyer_mob', i.buyer_mob,
            'buyer_gst', i.buyer_gst,
            'items', (
              SELECT COALESCE(json_agg(ii.*), '[]')
              FROM invoice_items ii
              WHERE ii.invoice_id = i.id
            )
          )
        ) FILTER (WHERE i.id IS NOT NULL), '[]'
      ) AS invoices
      FROM sales s
      LEFT JOIN invoices i ON i.sale_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC;
    `;

    const result = await db.query(query);
    const sales = result.rows;

    let totalSalesVal = 0;
    let invoiceCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    sales.forEach(sale => {
      totalSalesVal += Number(sale.customer_total);
      if (Array.isArray(sale.invoices)) {
        sale.invoices.forEach(inv => {
          invoiceCount++;
          if (inv.status === 'accepted') acceptedCount++;
          else if (inv.status === 'rejected') rejectedCount++;
          else pendingCount++;
        });
      }
    });

    const completionRate = invoiceCount > 0 ? Math.round((acceptedCount / invoiceCount) * 100) : 0;

    return res.status(200).json({
      sales,
      metrics: {
        totalSalesVal,
        invoiceCount,
        acceptedCount,
        rejectedCount,
        pendingCount,
        completionRate
      }
    });
  } catch (err) {
    console.error('Dashboard data error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret_for_dev', { expiresIn: '1d' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'Invalid Password' });
});

router.post('/api/logout', (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });
  return res.json({ success: true });
});

router.post('/api/shopkeeper-login', (req, res) => {
  const { store, password } = req.body;
  
  let validPassword = null;
  if (store === 'SM1 — Thane') validPassword = process.env.STORE_THANE_PASSWORD;
  else if (store === 'SM2 — Mulund') validPassword = process.env.STORE_MULUND_PASSWORD;
  else if (store === 'SM Online') validPassword = process.env.STORE_ONLINE_PASSWORD;

  if (validPassword && password === validPassword) {
    const token = jwt.sign({ role: 'shopkeeper', store }, process.env.JWT_SECRET || 'fallback_secret_for_dev', { expiresIn: '1d' });
    res.cookie('shopkeeper_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    return res.json({ success: true, store });
  }
  
  return res.status(401).json({ success: false, error: 'Invalid Store or Password' });
});

router.get('/api/shopkeeper/me', (req, res) => {
  const token = req.cookies.shopkeeper_token;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');
    if (decoded.role === 'shopkeeper' && decoded.store) {
      return res.json({ success: true, store: decoded.store });
    }
    return res.status(401).json({ success: false, error: 'Invalid token payload' });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

router.post('/api/shopkeeper-logout', (req, res) => {
  res.clearCookie('shopkeeper_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });
  return res.json({ success: true });
});

router.get('/api/shopkeeper/history', async (req, res) => {
  const token = req.cookies.shopkeeper_token;
  if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');
    if (decoded.role !== 'shopkeeper' || !decoded.store) {
      return res.status(401).json({ success: false, error: 'Invalid permissions' });
    }
    
    const query = `
      SELECT s.*, 
        (
          SELECT COALESCE(json_agg(ii.*), '[]')
          FROM (
             SELECT product_name, category, weight, SUM(qty) as qty 
             FROM invoice_items 
             WHERE invoice_id IN (SELECT id FROM invoices WHERE sale_id = s.id AND from_entity = 'SIPL')
             GROUP BY product_name, category, weight
          ) ii
        ) as products,
        COALESCE(json_agg(i.*) FILTER (WHERE i.id IS NOT NULL), '[]') AS invoices
      FROM sales s
      LEFT JOIN invoices i ON i.sale_id = s.id
      WHERE s.store = $1
      GROUP BY s.id
      ORDER BY s.created_at DESC;
    `;
    const result = await db.query(query, [decoded.store]);
    return res.json({ success: true, history: result.rows });
  } catch (err) {
    console.error('Shopkeeper history error:', err);
    return res.status(500).json({ success: false, error: 'Server error retrieving history' });
  }
});

router.post('/api/shopkeeper/sales/:id/toggle-item', async (req, res) => {
  const token = req.cookies.shopkeeper_token;
  if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');
    if (decoded.role !== 'shopkeeper' || !decoded.store) {
      return res.status(401).json({ success: false, error: 'Invalid permissions' });
    }
    
    const { id } = req.params;
    const { product_name } = req.body;
    
    const saleRes = await db.query('SELECT checked_items FROM sales WHERE id = $1 AND store = $2', [id, decoded.store]);
    if (saleRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }
    
    let checkedItems = saleRes.rows[0].checked_items || [];
    
    if (checkedItems.includes(product_name)) {
      checkedItems = checkedItems.filter(p => p !== product_name);
    } else {
      checkedItems.push(product_name);
    }
    
    await db.query(
      'UPDATE sales SET checked_items = $1::jsonb WHERE id = $2',
      [JSON.stringify(checkedItems), id]
    );
    
    // We get the current status to return
    const currentStatusRes = await db.query('SELECT status FROM sales WHERE id = $1', [id]);
    const currentStatus = currentStatusRes.rows[0]?.status || 'open';
    
    return res.json({ success: true, checked_items: checkedItems, status: currentStatus });
  } catch (err) {
    console.error('Toggle item error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/api/shopkeeper/sales/:id/status', async (req, res) => {
  const token = req.cookies.shopkeeper_token;
  if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');
    if (decoded.role !== 'shopkeeper' || !decoded.store) {
      return res.status(401).json({ success: false, error: 'Invalid permissions' });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const saleRes = await db.query('UPDATE sales SET status = $1 WHERE id = $2 AND store = $3 RETURNING status', [status, id, decoded.store]);
    if (saleRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }
    
    return res.json({ success: true, status: saleRes.rows[0].status });
  } catch (err) {
    console.error('Toggle item error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const route = req.query.route || null;
    const sort = req.query.sort || 'revenue'; // 'qty' or 'revenue'
    
    // Current month total sales
    const totalSalesRes = await db.query(`
      SELECT SUM(customer_total) as total
      FROM sales
      WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
    `);
    
    // Previous month total sales
    const prevSalesRes = await db.query(`
      SELECT SUM(customer_total) as total
      FROM sales
      WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    // All time invoices (for display)
    const totalInvoicesRes = await db.query(`SELECT COUNT(*) as total FROM invoices`);
    const acceptedInvoicesRes = await db.query(`SELECT COUNT(*) as total FROM invoices WHERE status = 'accepted'`);

    // Current month invoices (for deltas)
    const currentMonthInvoicesRes = await db.query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE invoices.status = 'accepted') as accepted
      FROM invoices
      JOIN sales ON invoices.sale_id = sales.id
      WHERE date_trunc('month', sales.created_at) = date_trunc('month', CURRENT_DATE)
    `);
    
    // Previous month invoices (for deltas)
    const prevMonthInvoicesRes = await db.query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE invoices.status = 'accepted') as accepted
      FROM invoices
      JOIN sales ON invoices.sale_id = sales.id
      WHERE date_trunc('month', sales.created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    const totalInv = parseInt(totalInvoicesRes.rows[0].total) || 0;
    const acceptedInv = parseInt(acceptedInvoicesRes.rows[0].total) || 0;
    const acceptanceRate = totalInv > 0 ? ((acceptedInv / totalInv) * 100).toFixed(1) : 0;

    // Calculate Deltas
    const currSales = parseFloat(totalSalesRes.rows[0].total) || 0;
    const prevSales = parseFloat(prevSalesRes.rows[0].total) || 0;
    const salesDelta = prevSales > 0 ? (((currSales - prevSales) / prevSales) * 100).toFixed(1) : (currSales > 0 ? 100 : 0);
    
    const currInvMonthly = parseInt(currentMonthInvoicesRes.rows[0].total) || 0;
    const prevInvMonthly = parseInt(prevMonthInvoicesRes.rows[0].total) || 0;
    const invDelta = prevInvMonthly > 0 ? (((currInvMonthly - prevInvMonthly) / prevInvMonthly) * 100).toFixed(1) : (currInvMonthly > 0 ? 100 : 0);
    
    const currAccInvMonthly = parseInt(currentMonthInvoicesRes.rows[0].accepted) || 0;
    const currAccRateMonthly = currInvMonthly > 0 ? (currAccInvMonthly / currInvMonthly) * 100 : 0;
    const prevAccInvMonthly = parseInt(prevMonthInvoicesRes.rows[0].accepted) || 0;
    const prevAccRateMonthly = prevInvMonthly > 0 ? (prevAccInvMonthly / prevInvMonthly) * 100 : 0;
    const accRateDelta = (currAccRateMonthly - prevAccRateMonthly).toFixed(1);

    // Route breakdown (does not respect the route filter, as clicking it should reset)
    const routeBreakdownRes = await db.query(`
      SELECT from_entity, SUM(grand_total) as total_amount
      FROM invoices
      GROUP BY from_entity
    `);

    // Top products (respects route filter and sort)
    const routeParams = route ? [route] : [];
    const routeCondition = route ? `WHERE invoices.from_entity = $1` : ``;
    
    const topProductsRes = await db.query(`
      SELECT invoice_items.product_name, ROUND(SUM(invoice_items.qty), 2) as total_qty, ROUND(SUM(invoice_items.total), 2) as total_revenue
      FROM invoice_items
      JOIN invoices ON invoice_items.invoice_id = invoices.id
      ${routeCondition}
      GROUP BY invoice_items.product_name
      ORDER BY ${sort === 'qty' ? 'total_qty' : 'total_revenue'} DESC
      LIMIT 5
    `, routeParams);

    return res.json({
      totalSalesThisMonth: currSales,
      totalInvoices: totalInv,
      acceptanceRate,
      deltas: {
        sales: salesDelta,
        invoices: invDelta,
        acceptanceRate: accRateDelta
      },
      routeBreakdown: routeBreakdownRes.rows,
      topProducts: topProductsRes.rows
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/api/dashboard/chart-data', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const dailyRes = await db.query(`
      SELECT date(sales.created_at) as date_val, invoices.from_entity, SUM(invoices.grand_total) as total
      FROM invoices
      JOIN sales ON invoices.sale_id = sales.id
      WHERE sales.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY date(sales.created_at), invoices.from_entity
      ORDER BY date_val ASC
    `);
    
    return res.json({ dailySales: dailyRes.rows });
  } catch (err) {
    console.error('Chart data error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/api/dashboard/acceptance-trend', requireAuth, async (req, res) => {
  try {
    const route = req.query.route || null;
    const routeParams = route ? [route] : [];
    const routeCondition = route ? `AND invoices.from_entity = $1` : ``;
    
    const weeklyRes = await db.query(`
      SELECT date_trunc('week', sales.created_at) as week_val,
             COUNT(invoices.id) as total_invoices,
             COUNT(invoices.id) FILTER (WHERE invoices.status = 'accepted') as accepted_invoices
      FROM invoices
      JOIN sales ON invoices.sale_id = sales.id
      WHERE sales.created_at >= NOW() - INTERVAL '12 weeks'
      ${routeCondition}
      GROUP BY week_val
      ORDER BY week_val ASC
    `, routeParams);
    
    return res.json({ weeklyTrend: weeklyRes.rows });
  } catch (err) {
    console.error('Acceptance trend error:', err);
    return res.status(500).json({ error: err.message });
  }
});

const reportFilename = (type, date, ext) => `sugandh_mart_${type}_report_${date}.${ext}`;

const csvValue = (value) => {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
};

const buildReportCSV = (analytics) => {
  const { period, kpis, trend, routeBreakdown, categoryBreakdown, storeBreakdown, topProducts, invoiceStatus } = analytics;
  const lines = [];

  lines.push('Sugandh Mart Business Report');
  lines.push(`Period,${csvValue(period.label)}`);
  lines.push('');
  lines.push('Summary');
  [
    ['Customer Sales', kpis.totalCustomerSales],
    ['Average Bill Value', kpis.averageBillValue],
    ['Retail Bills', kpis.salesCount],
    ['Invoice Grand Total', kpis.invoiceGrandTotal],
    ['Invoice GST', kpis.invoiceGst],
    ['Total Invoices', kpis.totalInvoices],
    ['Accepted Invoices', kpis.acceptedCount],
    ['Pending Invoices', kpis.pendingCount],
    ['Rejected Invoices', kpis.rejectedCount],
    ['Acceptance Rate %', kpis.acceptanceRate],
    ['Top Product', kpis.topProduct || ''],
    ['Top Category', kpis.topCategory || ''],
    ['Best Route', kpis.bestRoute || '']
  ].forEach(row => lines.push(row.map(csvValue).join(',')));

  lines.push('');
  lines.push('Sales Trend');
  lines.push('Date,Customer Sales,Invoice Value,Bills');
  trend.forEach(row => lines.push([row.date, row.customer_sales, row.invoice_value, row.bills].map(csvValue).join(',')));

  lines.push('');
  lines.push('Route Breakdown');
  lines.push('Route,Invoices,Total Amount');
  routeBreakdown.forEach(row => lines.push([row.route_label, row.invoice_count, row.total_amount].map(csvValue).join(',')));

  lines.push('');
  lines.push('Category Breakdown');
  lines.push('Category,Total Qty,Total Revenue');
  categoryBreakdown.forEach(row => lines.push([row.category, row.total_qty, row.total_revenue].map(csvValue).join(',')));

  lines.push('');
  lines.push('Store Breakdown');
  lines.push('Store,Bills,Customer Sales,Invoice Value');
  storeBreakdown.forEach(row => lines.push([row.store, row.sales_count, row.customer_sales, row.invoice_value].map(csvValue).join(',')));

  lines.push('');
  lines.push('Top Products');
  lines.push('Product,Category,Total Qty,Total Revenue');
  topProducts.forEach(row => lines.push([row.product_name, row.category, row.total_qty, row.total_revenue].map(csvValue).join(',')));

  lines.push('');
  lines.push('Invoice Status');
  lines.push('Status,Invoices,Total Amount');
  invoiceStatus.forEach(row => lines.push([row.status, row.count, row.total_amount].map(csvValue).join(',')));

  return lines.join('\n');
};

const addWorksheet = (workbook, name, columns, rows) => {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map(col => ({ header: col.header, key: col.key, width: col.width || 18 }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF211A14' } };
  rows.forEach(row => sheet.addRow(row));
  sheet.eachRow(row => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE8DEC8' } },
        left: { style: 'thin', color: { argb: 'FFE8DEC8' } },
        bottom: { style: 'thin', color: { argb: 'FFE8DEC8' } },
        right: { style: 'thin', color: { argb: 'FFE8DEC8' } }
      };
      cell.alignment = { vertical: 'middle' };
    });
  });
  return sheet;
};

const buildReportWorkbook = (analytics) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sugandh Mart Central Ledger';
  workbook.created = new Date();
  const { period, kpis, trend, routeBreakdown, categoryBreakdown, storeBreakdown, topProducts, invoiceStatus, recentSales } = analytics;

  addWorksheet(workbook, 'Summary', [
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Value', key: 'value', width: 28 }
  ], [
    { metric: 'Report Period', value: period.label },
    { metric: 'Customer Sales', value: kpis.totalCustomerSales },
    { metric: 'Average Bill Value', value: kpis.averageBillValue },
    { metric: 'Retail Bills', value: kpis.salesCount },
    { metric: 'Invoice Grand Total', value: kpis.invoiceGrandTotal },
    { metric: 'Invoice GST', value: kpis.invoiceGst },
    { metric: 'Total Invoices', value: kpis.totalInvoices },
    { metric: 'Accepted Invoices', value: kpis.acceptedCount },
    { metric: 'Pending Invoices', value: kpis.pendingCount },
    { metric: 'Rejected Invoices', value: kpis.rejectedCount },
    { metric: 'Acceptance Rate %', value: kpis.acceptanceRate },
    { metric: 'Top Product', value: kpis.topProduct || '-' },
    { metric: 'Top Category', value: kpis.topCategory || '-' },
    { metric: 'Best Route', value: kpis.bestRoute || '-' }
  ]);

  addWorksheet(workbook, 'Sales Trend', [
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Customer Sales', key: 'customer_sales', width: 18 },
    { header: 'Invoice Value', key: 'invoice_value', width: 18 },
    { header: 'Bills', key: 'bills', width: 12 }
  ], trend.map(row => ({ ...row, date: String(row.date).slice(0, 10) })));

  addWorksheet(workbook, 'Route Breakdown', [
    { header: 'Route', key: 'route_label', width: 34 },
    { header: 'Invoices', key: 'invoice_count', width: 12 },
    { header: 'Total Amount', key: 'total_amount', width: 18 }
  ], routeBreakdown);

  addWorksheet(workbook, 'Category Breakdown', [
    { header: 'Category', key: 'category', width: 36 },
    { header: 'Total Qty', key: 'total_qty', width: 14 },
    { header: 'Total Revenue', key: 'total_revenue', width: 18 }
  ], categoryBreakdown);

  addWorksheet(workbook, 'Store Breakdown', [
    { header: 'Store', key: 'store', width: 22 },
    { header: 'Bills', key: 'sales_count', width: 12 },
    { header: 'Customer Sales', key: 'customer_sales', width: 18 },
    { header: 'Invoice Value', key: 'invoice_value', width: 18 }
  ], storeBreakdown);

  addWorksheet(workbook, 'Top Products', [
    { header: 'Product', key: 'product_name', width: 34 },
    { header: 'Category', key: 'category', width: 34 },
    { header: 'Total Qty', key: 'total_qty', width: 14 },
    { header: 'Total Revenue', key: 'total_revenue', width: 18 }
  ], topProducts);

  addWorksheet(workbook, 'Invoice Status', [
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Invoices', key: 'count', width: 12 },
    { header: 'Total Amount', key: 'total_amount', width: 18 }
  ], invoiceStatus);

  addWorksheet(workbook, 'Recent Sales', [
    { header: 'Sale ID', key: 'id', width: 12 },
    { header: 'Store', key: 'store', width: 22 },
    { header: 'Created At', key: 'created_at', width: 24 },
    { header: 'Customer Total', key: 'customer_total', width: 18 },
    { header: 'Invoices', key: 'invoice_count', width: 12 },
    { header: 'Invoice Value', key: 'invoice_value', width: 18 }
  ], recentSales.map(row => ({ ...row, created_at: row.created_at ? new Date(row.created_at).toLocaleString('en-IN') : '' })));

  return workbook;
};

router.get('/api/reports', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM reports ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/reports/analytics', requireAuth, async (req, res) => {
  try {
    const { type = 'monthly', date } = req.query;
    if (!date) return res.status(400).json({ error: 'Missing date' });
    const analytics = await getReportAnalytics(db, type, date);
    res.json(analytics);
  } catch (err) {
    console.error('Report analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/reports/generate', requireAuth, async (req, res) => {
  try {
    const { type, date } = req.body;
    if (!['daily', 'weekly', 'monthly'].includes(type)) return res.status(400).json({error: 'Invalid type'});

    const reportData = await getReportAnalytics(db, type, date);
    const pdfBuffer = await generateReportPDF(reportData);

    const reportsDir = path.join(__dirname, '..', 'pdfs', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = reportFilename(type, date, 'pdf').replace('.pdf', `_${Date.now()}.pdf`);
    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    const insertRes = await db.query(`
      INSERT INTO reports (report_type, report_date, file_path) 
      VALUES ($1, $2, $3) RETURNING *
    `, [type, date, `/pdfs/reports/${filename}`]);

    return res.json({ success: true, report: insertRes.rows[0] });
  } catch(err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/reports/export-csv', requireAuth, async (req, res) => {
  try {
    const { type, date } = req.query;
    if (!['daily', 'weekly', 'monthly'].includes(type)) return res.status(400).json({error: 'Invalid type'});
    if (!date) return res.status(400).json({ error: 'Missing date' });
    const analytics = await getReportAnalytics(db, type, date);
    const csvContent = buildReportCSV(analytics);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(type, date, 'csv')}"`);
    return res.send(csvContent);
  } catch(err) {
    console.error('CSV Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/reports/export-excel', requireAuth, async (req, res) => {
  try {
    const { type, date } = req.query;
    if (!['daily', 'weekly', 'monthly'].includes(type)) return res.status(400).json({error: 'Invalid type'});
    if (!date) return res.status(400).json({ error: 'Missing date' });
    const analytics = await getReportAnalytics(db, type, date);
    const workbook = buildReportWorkbook(analytics);
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${reportFilename(type, date, 'xlsx')}"`);
    return res.send(Buffer.from(buffer));
  } catch(err) {
    console.error('Excel Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
