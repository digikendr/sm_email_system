const pool = require('./db');

async function main() {
  const result = await pool.query('SELECT id, from_entity, to_entity, invoice_number, amount, gst, grand_total FROM invoices ORDER BY id DESC LIMIT 5');
  console.log(result.rows);
  process.exit(0);
}
main();
