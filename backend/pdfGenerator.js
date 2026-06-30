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

const companyData = {
  SADVIK: {
    sellerName: 'SHREE SADVIK PERFUMERY WORKS',
    sellerAddress: 'Sai Nagar Society, A-Wing, Ground Floor, Room No. 1, Near Shivam Building, Vitawa, Thane - 400605.',
    sellerMob: '9930300069 / 9833540041',
    sellerGst: 'N/A',
    sellerPan: 'N/A',
    buyerName: 'M/S. Sugandh Mart (Online)',
    buyerAddress: 'Shop No 10, Dedhia Avenue, Near Mulund Station, RRT Road - Ganesh Gawde Road Junction, Mulund West, Mumbai 400080.',
    buyerMob: '9867091077',
    buyerGst: '27BTKPP0365H1ZG',
    bankName: 'Axis Bank',
    bankAcType: 'Current A/c',
    bankAcNo: '925020013633107',
    bankIfsc: 'UTIB0000508',
    bankBranch: 'Mulund West'
  },
  ALEITR: {
    sellerName: 'AL-EITR',
    sellerAddress: 'C2-Wing, Shop No. 12, Ashar Estate, Shree Nagar, Wagle Estate, Thane - 400604.',
    sellerMob: '9833540041',
    sellerGst: '27ABWFA9136E1Z1',
    sellerPan: 'ABWFA9136E',
    buyerName: 'M/S. Sugandh Mart 1',
    buyerAddress: 'Swargandha CHS, Shop No. 8, Ground Floor, Shree Nagar, Wagle Estate, Thane - 400604.',
    buyerMob: '9987261467',
    buyerGst: '27BTKPP0365H1ZG',
    bankName: 'ICICI Bank',
    bankAcType: 'Current A/c',
    bankAcNo: '124405001220',
    bankIfsc: 'ICIC0001244',
    bankBranch: 'Mulund (West)'
  },
  SIPL: {
    sellerName: 'SVAR INTERNATIONAL PRIVATE LIMITED',
    sellerAddress: 'Plot No. C-6, Phase-I, MIDC, Golavli, Kalyan Shill Phatta Road, Dombivali East, Thane - 421203.',
    sellerMob: '8879942929',
    sellerGst: '27AARCS9672G1ZJ',
    sellerPan: 'AARCS9672G',
    buyerName: 'M/S. AL-EITR',
    buyerAddress: '610, Runwal R-Square, L.B.S. Marg, Mulund (W), Mumbai - 400080.',
    buyerMob: '9833540041',
    buyerGst: '27ABWFA9136E1Z1',
    bankName: 'Bank of Baroda',
    bankAcType: 'Cash Credit (CC)',
    bankAcNo: '99110500000025',
    bankIfsc: 'BARB0DBSHRE',
    bankBranch: 'Thane (Shreenagar)'
  },
  SFNF: {
    sellerName: 'SVAR FRAGRANCES & FLAVORS PRIVATE LIMITED',
    sellerAddress: 'Plot No. C-6, Phase-I, MIDC, Golavli, Kalyan Shill Phatta Road, Dombivali East, Thane - 421203.',
    sellerMob: '8879942929',
    sellerGst: '27AAUCS5058F1ZU',
    sellerPan: 'AAUCS5058F',
    buyerName: 'M/S. Svar International Pvt Ltd',
    buyerAddress: '610, Runwal R-Square, L.B.S. Marg, Mulund (West), Mumbai - 400080.',
    buyerMob: '8879942929',
    buyerGst: '27AARCS9672G1ZJ',
    bankName: 'Bank of Baroda',
    bankAcType: 'Cash Credit (CC)',
    bankAcNo: '99110500000024',
    bankIfsc: 'BARB0DBSHRE',
    bankBranch: 'Thane (Shreenagar)'
  }
};

async function generateInvoicePDF(invoice, store, date) {
  const cd = companyData[invoice.from_entity] || {
    sellerName: COMPANY_NAMES[invoice.from_entity] || invoice.from_entity,
    sellerAddress: '-',
    sellerMob: '-',
    sellerGst: '-',
    sellerPan: '-',
    buyerName: COMPANY_NAMES[invoice.to_entity] || invoice.to_entity,
    buyerAddress: '-',
    buyerMob: '-',
    buyerGst: '-',
    bankName: '-',
    bankAcType: '-',
    bankAcNo: '-',
    bankIfsc: '-',
    bankBranch: '-'
  };

  const d = new Date(date || new Date());
  const fmtDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

  const hsn = invoice.hsn || 'N/A';
  const subtotal = Number(invoice.amount) || 0;
  const gst = Number(invoice.gst) || 0;
  const cgst = gst / 2;
  const sgst = gst / 2;
  const grandTotal = Number(invoice.grand_total) || 0;
  
  let itemsHtml = '';
  let totalQty = 0;
  
  const isKg = invoice.to_entity === 'SIPL';
  const qtyLabel = isKg ? 'NETT QTY IN KGS' : 'NETT QTY IN PCS';
  const priceLabel = isKg ? 'PRICE PER KGS' : 'PRICE PER PCS';
  const totalLabel = isKg ? 'TOTAL NETT WT.(KGS)' : 'TOTAL NETT QTY (PCS)';
  
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item, i) => {
      const itemQty = Number(item.qty) || 0;
      totalQty += itemQty;
      itemsHtml += `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${item.name} <small>${item.cat}${item.wt ? ' · ' + item.wt + 'g' : ''}</small></td>
          <td class="r">${isKg ? itemQty.toFixed(3) : itemQty}</td>
          <td class="r">${formatINR(item.rate)}</td>
          <td class="r">${formatINR(item.total)}</td>
        </tr>
      `;
    });
  }

  const html = `
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
            <div class="title">${cd.sellerName}</div>
            <div class="address">${cd.sellerAddress}</div>
            <div>MOBILE NO: ${cd.sellerMob}</div>
            <div>GST NO: ${cd.sellerGst}</div>
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
              <div class="title">${cd.buyerName}</div>
              <div class="address">${cd.buyerAddress}</div>
              <div>MOBILE NO: ${cd.buyerMob}</div>
              <div>GST NO: ${cd.buyerGst}</div>
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
              <td class="c"></td>
              <td class="c"></td>
              <td class="c">-</td>
            </tr>
          </tbody>
        </table>

        <table style="border-top: none;">
          <thead>
            <tr>
              <th style="width: 40px;" class="c">Sr. No.</th>
              <th>DESCRIPTION OF GOODS</th>
              <th class="r">${qtyLabel}</th>
              <th class="r">${priceLabel}</th>
              <th class="r">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="border-bottom: 1px solid #000; border-top: 1px solid #000;">
              <td colspan="2" class="r bold" style="border-right: none;">${totalLabel}</td>
              <td class="r bold">${isKg ? totalQty.toFixed(2) : totalQty}</td>
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
            <div><span class="bold">GST NO:</span> ${cd.sellerGst}</div>
            <div><span class="bold">PAN NO:</span> ${cd.sellerPan}</div>
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
            <div class="small-text" style="margin-top: 10px;">For ${cd.sellerName}.</div>
            <div class="sign-box">Authorized Signatory</div>
          </div>
        </div>
        
        <div style="text-align: center; font-style: italic; font-weight: bold; padding: 6px; border-top: 1px solid #000;">
          Thank You For Your Business!
        </div>
        
        <div class="bank-details">
          <div class="bold" style="margin-bottom: 5px;">BANK DETAILS:- ${cd.sellerName}</div>
          <div class="bank-grid">
            <div class="bold">BANK:-</div><div>${cd.bankName}</div>
            <div class="bold">A/C. NO.:-</div><div>${cd.bankAcNo}</div>
            <div class="bold">A/C. TYPE.:-</div><div>${cd.bankAcType}</div>
            <div class="bold">BRANCH:-</div><div>${cd.bankBranch}</div>
            <div class="bold">IFSC CODE:-</div><div>${cd.bankIfsc}</div>
          </div>
          <div class="small-text" style="text-align: center; margin-top: 12px; color: #444;">THIS IS A COMPUTER GENERATED BILL, NO NEED OF SIGNATURE</div>
        </div>
        
      </div>
    </body>
    </html>
  `;

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
