const db = require('./backend/db');
(async () => {
  try {
    const totalSalesRes = await db.query(`
      SELECT SUM(customer_total) as total
      FROM sales
      WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
    `);
    console.log("totalSalesRes:", totalSalesRes.rows);
    
    const prevSalesRes = await db.query(`
      SELECT SUM(customer_total) as total
      FROM sales
      WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    `);
    console.log("prevSalesRes:", prevSalesRes.rows);

    const currentMonthInvoicesRes = await db.query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'accepted') as accepted
      FROM invoices
      JOIN sales ON invoices.sale_id = sales.id
      WHERE date_trunc('month', sales.created_at) = date_trunc('month', CURRENT_DATE)
    `);
    console.log("currentMonthInvoicesRes:", currentMonthInvoicesRes.rows);
    
    console.log("SUCCESS");
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit(0);
  }
})();
