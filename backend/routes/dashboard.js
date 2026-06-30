const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { generateReportPDF } = require('../reportGenerator');

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per window
  message: { success: false, error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
      SELECT s.*, COALESCE(json_agg(i.*) FILTER (WHERE i.id IS NOT NULL), '[]') AS invoices
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

router.post('/api/verify-password', passwordLimiter, (req, res) => {
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

router.post('/api/shopkeeper-login', passwordLimiter, (req, res) => {
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
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'accepted') as accepted
      FROM invoices
      JOIN sales ON invoices.sale_id = sales.id
      WHERE date_trunc('month', sales.created_at) = date_trunc('month', CURRENT_DATE)
    `);
    
    // Previous month invoices (for deltas)
    const prevMonthInvoicesRes = await db.query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'accepted') as accepted
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

router.get('/api/reports', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM reports ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/reports/generate', requireAuth, async (req, res) => {
  try {
    const { type, date } = req.body;
    if (!['daily', 'weekly', 'monthly'].includes(type)) return res.status(400).json({error: 'Invalid type'});
    
    const existing = await db.query(`SELECT * FROM reports WHERE report_type = $1 AND report_date = $2`, [type, date]);
    if (existing.rows.length > 0) {
      return res.json({ success: true, report: existing.rows[0] });
    }

    let dateCondition = '';
    let displayDate = '';
    const targetDate = new Date(date);
    
    if (type === 'daily') {
      dateCondition = `date(created_at) = $1`;
      displayDate = targetDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } else if (type === 'monthly') {
      dateCondition = `date_trunc('month', created_at) = date_trunc('month', $1::date)`;
      displayDate = targetDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else if (type === 'weekly') {
      dateCondition = `date_trunc('week', created_at) = date_trunc('week', $1::date)`;
      displayDate = `Week of ` + targetDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    const totalSalesRes = await db.query(`SELECT SUM(customer_total) as total FROM sales WHERE ${dateCondition}`, [date]);
    
    const totalInvoicesRes = await db.query(`
      SELECT COUNT(*) as total FROM invoices 
      JOIN sales ON sales.id = invoices.sale_id 
      WHERE ${dateCondition.replace('created_at', 'sales.created_at')}
    `, [date]);
    
    const acceptedInvoicesRes = await db.query(`
      SELECT COUNT(*) as total FROM invoices 
      JOIN sales ON sales.id = invoices.sale_id 
      WHERE invoices.status = 'accepted' AND ${dateCondition.replace('created_at', 'sales.created_at')}
    `, [date]);

    const totalInv = parseInt(totalInvoicesRes.rows[0].total) || 0;
    const acceptedInv = parseInt(acceptedInvoicesRes.rows[0].total) || 0;
    const acceptanceRate = totalInv > 0 ? ((acceptedInv / totalInv) * 100).toFixed(1) : 0;

    const routeBreakdownRes = await db.query(`
      SELECT invoices.from_entity, SUM(invoices.grand_total) as total_amount
      FROM invoices
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${dateCondition.replace('created_at', 'sales.created_at')}
      GROUP BY invoices.from_entity
    `, [date]);

    const topProductsRes = await db.query(`
      SELECT invoice_items.product_name, ROUND(SUM(invoice_items.qty), 2) as total_qty
      FROM invoice_items
      JOIN invoices ON invoices.id = invoice_items.invoice_id
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${dateCondition.replace('created_at', 'sales.created_at')}
      GROUP BY invoice_items.product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `, [date]);

    const reportData = {
      totalSales: totalSalesRes.rows[0].total || 0,
      totalInvoices: totalInv,
      acceptanceRate,
      routeBreakdown: routeBreakdownRes.rows,
      topProducts: topProductsRes.rows
    };

    const pdfBuffer = await generateReportPDF(reportData, type, displayDate);

    const reportsDir = path.join(__dirname, '..', 'pdfs', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `report_${type}_${date}_${Date.now()}.pdf`;
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
    
    let dateCondition = '';
    
    if (type === 'daily') {
      dateCondition = `date(sales.created_at) = $1`;
    } else if (type === 'monthly') {
      dateCondition = `date_trunc('month', sales.created_at) = date_trunc('month', $1::date)`;
    } else if (type === 'weekly') {
      dateCondition = `date_trunc('week', sales.created_at) = date_trunc('week', $1::date)`;
    }

    const routeBreakdownRes = await db.query(`
      SELECT invoices.from_entity, SUM(invoices.grand_total) as total_amount
      FROM invoices
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${dateCondition}
      GROUP BY invoices.from_entity
    `, [date]);

    const topProductsRes = await db.query(`
      SELECT invoice_items.product_name, ROUND(SUM(invoice_items.qty), 2) as total_qty, ROUND(SUM(invoice_items.total), 2) as total_revenue
      FROM invoice_items
      JOIN invoices ON invoices.id = invoice_items.invoice_id
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${dateCondition}
      GROUP BY invoice_items.product_name
      ORDER BY total_revenue DESC
    `, [date]);

    let csvContent = 'Route Breakdown\nRoute,Total Amount\n';
    if (routeBreakdownRes.rows.length === 0) {
      csvContent += 'No data found for this period.,\n';
    } else {
      routeBreakdownRes.rows.forEach(r => {
        csvContent += `"${r.from_entity}","${r.total_amount}"\n`;
      });
    }
    
    csvContent += '\nTop Products\nProduct,Total Qty,Total Revenue\n';
    if (topProductsRes.rows.length === 0) {
      csvContent += 'No data found for this period.,,\n';
    } else {
      topProductsRes.rows.forEach(p => {
        csvContent += `"${p.product_name}","${p.total_qty}","${p.total_revenue}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${type}_${date}.csv"`);
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
    
    let dateCondition = '';
    if (type === 'daily') {
      dateCondition = `date(sales.created_at) = $1`;
    } else if (type === 'monthly') {
      dateCondition = `date_trunc('month', sales.created_at) = date_trunc('month', $1::date)`;
    } else if (type === 'weekly') {
      dateCondition = `date_trunc('week', sales.created_at) = date_trunc('week', $1::date)`;
    }

    const routeBreakdownRes = await db.query(`
      SELECT invoices.from_entity, SUM(invoices.grand_total) as total_amount
      FROM invoices
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${dateCondition}
      GROUP BY invoices.from_entity
    `, [date]);

    const topProductsRes = await db.query(`
      SELECT invoice_items.product_name, ROUND(SUM(invoice_items.qty), 2) as total_qty, ROUND(SUM(invoice_items.total), 2) as total_revenue
      FROM invoice_items
      JOIN invoices ON invoices.id = invoice_items.invoice_id
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${dateCondition}
      GROUP BY invoice_items.product_name
      ORDER BY total_revenue DESC
    `, [date]);

    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Report</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
<h3>Route Breakdown</h3>
<table border="1">
  <tr><th>Route</th><th>Total Amount</th></tr>
  ${routeBreakdownRes.rows.length === 0 ? '<tr><td colspan="2" style="text-align:center;">No data found for this period.</td></tr>' : routeBreakdownRes.rows.map(r => `<tr><td>${r.from_entity}</td><td>${r.total_amount}</td></tr>`).join('')}
</table>
<br>
<h3>Top Products</h3>
<table border="1">
  <tr><th>Product</th><th>Total Qty</th><th>Total Revenue</th></tr>
  ${topProductsRes.rows.length === 0 ? '<tr><td colspan="3" style="text-align:center;">No data found for this period.</td></tr>' : topProductsRes.rows.map(r => `<tr><td>${r.product_name}</td><td>${r.total_qty}</td><td>${r.total_revenue}</td></tr>`).join('')}
</table>
</body>
</html>`;

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="report_${type}_${date}.xls"`);
    return res.send(html);
  } catch(err) {
    console.error('Excel Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
