const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const COMPANY_NAMES = {
  SFNF: 'Svar Fragrances & Flavors (SFNF)',
  SIPL: 'Svar International Pvt Ltd (SIPL)',
  SADVIK: 'Shree Sadvik Perfumery Works (Sadvik)',
  ALEITR: 'Al Eitr',
  SM: 'Sugandh Mart (SM)'
};

const formatINR = (n) => {
  return '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const buyerDetailsMap = {
  SIPL: {
    name: 'M/S. SVAR INTERNATIONAL PVT LTD',
    address: '610, RUNWAL R-SQUARE,\nL.B.S MARG, MULUND (WEST)\nMUMBAI - 400080',
    gst: '27AARCS9672G1ZJ',
    mobile: '8879942929'
  }
};

async function generateInvoicePDF(invoice, store, date) {
  const fromName = COMPANY_NAMES[invoice.from_entity] || invoice.from_entity;
  const toName = COMPANY_NAMES[invoice.to_entity] || invoice.to_entity;
  
  const d = new Date(date || new Date());
  const fmtDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

  const hsn = invoice.hsn || 'N/A';
  const subtotal = invoice.amount;
  const gst = invoice.gst;
  const cgst = gst / 2;
  const sgst = gst / 2;
  const grandTotal = invoice.grand_total;
  
  let html = '';

  if (invoice.from_entity === 'SFNF') {
    let itemsHtml = '';
    let totalQty = 0;
    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach((item, i) => {
        const itemQty = item.kg ? item.qty : item.qty;
        totalQty += itemQty;
        itemsHtml += `
          <tr>
            <td class="c">${i + 1}</td>
            <td>${item.name} <small>${item.cat}${item.wt ? ' · ' + item.wt + 'g' : ''}</small></td>
            <td class="r">${item.kg ? itemQty.toFixed(3) : itemQty}</td>
            <td class="r">${formatINR(item.rate)}</td>
            <td class="r">${formatINR(item.total)}</td>
          </tr>
        `;
      });
    }

    const buyer = buyerDetailsMap[invoice.to_entity] || {
      name: toName,
      address: '-',
      gst: '-',
      mobile: '-'
    };

    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0; font-size: 11px; line-height: 1.4; color: #000; background: white; }
          .container { width: 100%; border: 1px solid #000; box-sizing: border-box; }
          .header { text-align: center; background-color: #ffeb3b; padding: 6px; font-weight: bold; border-bottom: 1px solid #000; font-size: 14px; }
          .row { display: flex; border-bottom: 1px solid #000; }
          .col-6 { width: 50%; padding: 8px; box-sizing: border-box; }
          .border-right { border-right: 1px solid #000; }
          .title { font-weight: bold; font-size: 13px; margin-bottom: 5px; }
          .address { white-space: pre-line; margin-bottom: 5px; }
          .meta-info div { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
          .section-header { background-color: #2e5c8a; color: white; padding: 4px 8px; font-weight: bold; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #2e5c8a; color: white; padding: 6px; font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; font-size: 11px; text-align: left; }
          th.r { text-align: right; }
          td { padding: 6px; border-right: 1px solid #000; border-bottom: 1px dotted #888; font-size: 11px; }
          th:last-child, td:last-child { border-right: none; }
          .r { text-align: right; }
          .c { text-align: center; }
          .footer-table { width: 100%; border-collapse: collapse; }
          .footer-table td { border: none; padding: 3px 4px; border-bottom: 1px solid #ccc; }
          .footer-table td:last-child { text-align: right; border-bottom: 1px solid #ccc; }
          .footer-row { display: flex; }
          .footer-left { width: 60%; padding: 8px; border-right: 1px solid #000; box-sizing: border-box; }
          .footer-right { width: 40%; padding: 8px; box-sizing: border-box; display: flex; flex-direction: column; }
          .small-text { font-size: 9px; line-height: 1.3; }
          .bank-details { padding: 8px; border-top: 1px solid #000; }
          .bank-grid { display: grid; grid-template-columns: 80px 1fr; gap: 2px; font-size: 11px; }
          .sign-box { margin-top: auto; text-align: right; padding-top: 30px; font-weight: bold; }
          .bold { font-weight: bold; }
          small { display: block; color: #555; font-size: 10px; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">TAX INVOICE</div>
          
          <div class="row">
            <div class="col-6 border-right">
              <div class="title">SVAR FRAGRANCES & FLAVORS PRIVATE LIMITED.</div>
              <div class="address">Plot no.C-6 , Phase-I, M.I.D.C.,
Golavli, Kalyan shill Phatta Road,
Dombivali East.
Thane - 421 203.</div>
              <div>MOBILE NO: 8879942929</div>
              <div>GST NO: 27AAUCS5058F1ZU</div>
            </div>
            <div class="col-6">
              <div class="meta-info">
                <div><span class="bold">DATE:</span> <span>${fmtDate}</span></div>
                <div><span class="bold">INVOICE NO:</span> <span>${invoice.invoice_number}</span></div>
              </div>
            </div>
          </div>
          
          <div class="row">
            <div class="col-6 border-right" style="padding: 0;">
              <div class="section-header">BILL TO:</div>
              <div style="padding: 8px;">
                <div class="title">TO,</div>
                <div class="title">${buyer.name}</div>
                <div class="address">${buyer.address}</div>
                <div>MOBILE NO: ${buyer.mobile}</div>
                <div>GST NO: ${buyer.gst}</div>
              </div>
            </div>
            <div class="col-6" style="padding: 0;">
              <div class="section-header">SHIP TO (if different):</div>
              <div style="padding: 8px;">-</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr style="background-color: #2e5c8a; color: white;">
                <th class="c" style="background-color: transparent; border-right: 1px solid #fff;">SALESPERSON</th>
                <th class="c" style="background-color: transparent; border-right: 1px solid #fff;">SHIP VIA</th>
                <th class="c" style="background-color: transparent; border-right: 1px solid #fff;">F.O.B.</th>
                <th class="c" style="background-color: transparent;">TERMS</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #000;">
                <td class="c">-</td>
                <td class="c">SRI JAI ROADWAYS</td>
                <td class="c">DOMBIVALI</td>
                <td class="c">-</td>
              </tr>
            </tbody>
          </table>

          <table style="border-top: none;">
            <thead>
              <tr>
                <th style="width: 40px;" class="c">Sr. No.</th>
                <th>DESCRIPTION OF GOODS</th>
                <th class="r">NETT QTY IN KGS</th>
                <th class="r">PRICE PER KGS</th>
                <th class="r">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr style="border-bottom: 1px solid #000; border-top: 1px solid #000;">
                <td colspan="2" class="r bold" style="border-right: none;">TOTAL NETT WT.(KGS)</td>
                <td class="r bold">${totalQty.toFixed(2)}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer-row">
            <div class="footer-left">
              <div class="section-header" style="margin: -8px -8px 8px -8px;">Declaration:</div>
              <div class="small-text">
                I / we hereby certify that my/our registration
                certificate under the value added Tax Act, 2002 in force on the date
                on which the sales of goods specified in this Tax invoices made by
                me/us and that the transactions of sales covered by this tax
                invoice has been effected by me/us and it shall be for in the
                turnover of sales while filling of return and the tax, if any , payable
                the sale has been paid or shall be paid.
              </div>
              <div class="bold" style="margin-top: 8px; font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 4px;">GOODS ONCE SOLD CANNOT BE TAKEN BACK</div>
              <div class="section-header" style="margin: 8px -8px; padding: 2px 8px;">Subject to Thane Jurisdiction</div>
              <div style="margin-top: 4px;"><span class="bold">HSN CODE:</span> ${hsn}</div>
              <div><span class="bold">GST NO:</span> 27AAUCS5058F1ZU</div>
              <div><span class="bold">PAN NO:</span> AAUCS5058F</div>
            </div>
            
            <div class="footer-right">
              <table class="footer-table">
                <tr><td>SUBTOTAL</td><td>${formatINR(subtotal)}</td></tr>
                <tr><td>TOTAL</td><td>${formatINR(subtotal)}</td></tr>
                <tr><td>CGST @9%</td><td>${formatINR(cgst)}</td></tr>
                <tr><td>SGST @9%</td><td>${formatINR(sgst)}</td></tr>
                <tr><td>ROUND OFF</td><td>${formatINR(grandTotal - (subtotal + gst))}</td></tr>
                <tr><td class="bold">GRAND TOTAL</td><td class="bold">${formatINR(grandTotal)}</td></tr>
              </table>
              <div class="small-text" style="margin-top: 10px;">For SVAR FRAGRANCES AND FLAVORS PRIVATE LIMITED.</div>
              <div class="sign-box">Authorized Signatory</div>
            </div>
          </div>
          
          <div style="text-align: center; font-style: italic; font-weight: bold; padding: 6px; border-top: 1px solid #000;">
            Thank You For Your Business!
          </div>
          
          <div class="bank-details">
            <div class="bold" style="margin-bottom: 5px;">BANK DETAILS:- SVAR FRAGRANCES AND FLAVORS PRIVATE LIMITED</div>
            <div class="bank-grid">
              <div class="bold">BANK:-</div><div>BANK OF BARODA</div>
              <div class="bold">A/C. NO.:-</div><div>99110500000024</div>
              <div class="bold">A/C. TYPE.:-</div><div>CASH CREDIT (CC)</div>
              <div class="bold">BRANCH:-</div><div>Thane (Shreenagar)</div>
              <div class="bold">IFSC CODE:-</div><div>BARB0DBSHRE (Fifth character is ZERO)</div>
            </div>
            <div class="small-text" style="text-align: center; margin-top: 12px; color: #444;">THIS IS A COMPUTER GENERATED BILL, NO NEED OF SIGNATURE</div>
          </div>
          
        </div>
      </body>
      </html>
    `;
  } else {
    let itemsHtml = '';
    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach((item, i) => {
        itemsHtml += `
          <tr>
            <td>${i + 1}</td>
            <td class="desc">
              ${item.name}
              <small>${item.cat}${item.wt ? ' · ' + item.wt + 'g' : ''}</small>
            </td>
            <td class="r">${item.kg ? item.qty.toFixed(3) : item.qty}</td>
            <td class="r">${formatINR(item.rate)}</td>
            <td class="r">${formatINR(item.total)}</td>
          </tr>
        `;
      });
    }

    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          :root {
            --ink:#1a1410; --paper2:#fffaf0;
            --d8cbb0:#d8cbb0; --e8dec8:#e8dec8;
            --8a7a60:#8a7a60; --f0d9a8:#f0d9a8; --b8a884:#b8a884;
          }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--paper2);
            color: var(--ink);
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .inv {
            background: var(--paper2);
            width: 100%;
          }
          .inv-band {
            background: var(--ink);
            color: var(--paper2);
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .inv-band .from {
            font-family: Georgia, serif;
            font-size: 20px;
            font-weight: 700;
            color: var(--f0d9a8);
          }
          .inv-band .arrow {
            font-size: 12px;
            letter-spacing: 1px;
            color: var(--b8a884);
            text-transform: uppercase;
            margin-top: 4px;
          }
          .inv-band .to {
            font-size: 14px;
            font-weight: 600;
            margin-top: 2px;
          }
          .inv-band .rt {
            text-align: right;
            font-size: 12px;
            color: #cdbf9f;
            line-height: 1.7;
          }
          .inv-band .rt b {
            color: var(--paper2);
          }
          .inv-meta {
            display: flex;
            border-bottom: 1px solid var(--d8cbb0);
          }
          .inv-meta div {
            flex: 1;
            padding: 12px 18px;
            border-right: 1px solid var(--e8dec8);
            font-size: 12px;
            color: var(--8a7a60);
          }
          .inv-meta div:last-child {
            border-right: none;
          }
          .inv-meta div b {
            display: block;
            color: var(--ink);
            font-size: 13px;
            margin-top: 4px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead th {
            background: #efe6d2;
            font-size: 11px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #7a6843;
            text-align: left;
            padding: 12px 18px;
            border-bottom: 1px solid var(--d8cbb0);
          }
          thead th.r {
            text-align: right;
          }
          tbody td {
            padding: 12px 18px;
            border-bottom: 1px solid var(--e8dec8);
            font-size: 14px;
            color: var(--ink);
          }
          tbody td.r {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }
          .desc {
            font-weight: 600;
          }
          .desc small {
            display: block;
            color: var(--8a7a60);
            font-weight: 400;
            font-size: 12px;
            margin-top: 4px;
          }
          .inv-foot {
            padding: 20px 30px;
            display: flex;
            justify-content: flex-end;
            background: var(--paper2);
          }
          .totals {
            width: 320px;
            font-size: 14px;
          }
          .totals .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed var(--d8cbb0);
            color: var(--ink);
          }
          .totals .row.grand {
            border-bottom: none;
            border-top: 2px solid var(--ink);
            margin-top: 6px;
            padding-top: 14px;
            font-family: Georgia, serif;
            font-size: 22px;
            font-weight: 700;
          }
          .totals .row .lbl {
            color: var(--8a7a60);
          }
          .totals .row.grand .lbl {
            color: var(--ink);
          }
        </style>
      </head>
      <body>
        <div class="inv">
          <div class="inv-band">
            <div>
              <div class="from">${fromName}</div>
              <div class="arrow">▾ invoice to</div>
              <div class="to">${toName}</div>
            </div>
            <div class="rt">
              Invoice <b>${invoice.invoice_number}</b><br>
              Date <b>${fmtDate}</b><br>
              HSN <b>${hsn}</b>
            </div>
          </div>
          
          <div class="inv-meta">
            <div>Ship via<b>Tempo / Hand delivery</b></div>
            <div>F.O.B.<b>Mulund</b></div>
            <div>Terms<b>30 Days</b></div>
            <div>Store<b>${store}</b></div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>Description of goods</th>
                <th class="r">Qty</th>
                <th class="r">Rate</th>
                <th class="r">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="inv-foot">
            <div class="totals">
              <div class="row"><span class="lbl">Subtotal</span><span>${formatINR(subtotal)}</span></div>
              <div class="row"><span class="lbl">CGST</span><span>${formatINR(cgst)}</span></div>
              <div class="row"><span class="lbl">SGST</span><span>${formatINR(sgst)}</span></div>
              <div class="row grand"><span class="lbl">Grand Total</span><span>${formatINR(grandTotal)}</span></div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
  headless: 'new',
  executablePath: '/home/hitanshu/.cache/puppeteer/chrome/chrome-linux64/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateInvoicePDF };
