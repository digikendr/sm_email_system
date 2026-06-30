const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Cache name mappings for beautiful email rendering
const COMPANY_NAMES = {
  SFNF: 'Svar Fragrances & Flavors (SFNF)',
  SIPL: 'Svar International Pvt Ltd (SIPL)',
  SADVIK: 'Shree Sadvik Perfumery Works (Sadvik)',
  ALEITR: 'Al Eitr',
  SM: 'Sugandh Mart (SM)'
};

/**
 * Sends a purchase invoice acceptance email to the seller entity.
 * 
 * @param {string} toEmail - Email address of the FROM party
 * @param {object} invoice - Invoice details
 * @param {string} acceptUrl - URL to accept the invoice
 * @param {string} rejectUrl - URL to reject the invoice
 */
async function sendInvoiceEmail(toEmail, invoice, acceptUrl, rejectUrl) {
  const fromName = COMPANY_NAMES[invoice.from_entity] || invoice.from_entity;
  const toName = COMPANY_NAMES[invoice.to_entity] || invoice.to_entity;
  const grandTotalFormatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(invoice.grand_total);

  const mailOptions = {
    from: `"Sugandh Mart Ledger" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `Action Required: Pending Invoice`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Action Required: Invoice Acceptance</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f6f0e4;
            color: #1a1410;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            background-color: #fffaf0;
            border: 1px solid #d8cbb0;
            border-radius: 8px;
            padding: 30px;
            margin: 0 auto;
            box-shadow: 0 4px 12px rgba(40, 28, 12, 0.08);
          }
          .header {
            border-bottom: 2px solid #c8841f;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #9a5f12;
            margin: 0;
          }
          .invoice-num {
            font-size: 14px;
            color: #8a7a60;
            margin-top: 5px;
          }
          .details {
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .label {
            font-weight: bold;
            color: #2b2018;
          }
          .amount-container {
            background-color: #f0d9a8;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
            margin: 20px 0;
          }
          .amount-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #9a5f12;
          }
          .amount {
            font-size: 32px;
            font-weight: bold;
            color: #1a1410;
            margin-top: 5px;
          }
          .actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 30px 0;
          }
          .btn {
            display: inline-block;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 15px;
            color: white !important;
            text-align: center;
            min-width: 100px;
          }
          .btn-accept {
            background-color: #3f7a4d;
          }
          .btn-reject {
            background-color: #9c4a3c;
          }
          .footer {
            border-top: 1px solid #e8dec8;
            padding-top: 15px;
            font-size: 12px;
            color: #8a7a60;
            text-align: center;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">Purchase Invoice Acceptance</div>
            <div class="invoice-num">Pending Invoice Assignment</div>
          </div>
          
          <div class="details">
            <p><span class="label">From (Seller):</span> ${fromName}</p>
            <p><span class="label">To (Buyer):</span> ${toName}</p>
          </div>
          
          <div class="amount-container">
            <div class="amount-label">Grand Total</div>
            <div class="amount">${grandTotalFormatted}</div>
          </div>
          
          <p style="text-align: center; font-size: 14px; margin-bottom: 25px;">
            Please review this invoice and select an option below to accept or reject the charge:
          </p>
          
          <div class="actions">
            <!-- Table layout for button compatibility across email clients -->
            <table align="center" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="border-radius: 6px;" bgcolor="#3f7a4d">
                  <a href="${acceptUrl}" class="btn btn-accept" style="display: block; border: 12px solid #3f7a4d; border-radius: 6px; background-color: #3f7a4d; color: #ffffff; text-decoration: none; font-weight: bold;">Accept</a>
                </td>
                <td width="20"></td>
                <td align="center" style="border-radius: 6px;" bgcolor="#9c4a3c">
                  <a href="${rejectUrl}" class="btn btn-reject" style="display: block; border: 12px solid #9c4a3c; border-radius: 6px; background-color: #9c4a3c; color: #ffffff; text-decoration: none; font-weight: bold;">Reject</a>
                </td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            <p><strong>Note:</strong> This acceptance link will expire in 7 days.</p>
            <p>This is an automated message sent on behalf of Sugandh Mart Ledger.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendInvoiceEmail
};
