require('dotenv').config({path: './backend/.env'});
const db = require('./backend/db');

async function test() {
  try {
    console.log("Testing Top products query...");
    const routeCondition = "";
    const routeParams = [];
    const topProductsRes = await db.query(`
      SELECT invoice_items.product_name, ROUND(SUM(invoice_items.qty), 2) as total_qty, ROUND(SUM(invoice_items.total), 2) as total_revenue
      FROM invoice_items
      JOIN invoices ON invoice_items.invoice_id = invoices.id
      ${routeCondition}
      GROUP BY invoice_items.product_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `, routeParams);
    console.log("Top products query success!", topProductsRes.rows);
  } catch (err) {
    console.error("Top products query failed:", err);
  }

  process.exit(0);
}
test();
