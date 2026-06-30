require('dotenv').config();
const { sendInvoiceEmail } = require('./mailer');

async function test() {
  try {
    console.log("Sending test email...");
    const invoice = {
      from_entity: 'SIPL',
      to_entity: 'SADVIK',
      invoice_number: 'TEST1234',
      grand_total: 1500,
      token: 'test-token'
    };
    await sendInvoiceEmail(process.env.EMAIL_SADVIK, invoice, 'http://localhost/accept', 'http://localhost/reject');
    console.log("Test email sent successfully.");
  } catch (err) {
    console.error("Test email failed:", err);
  }
}
test();
