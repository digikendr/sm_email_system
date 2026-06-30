const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const formatINR = (n) => {
  return '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatQty = (n) => {
  const num = Number(n);
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(3));
};

async function generateReportPDF(reportData, type, dateString) {
  const { totalSales, totalInvoices, acceptanceRate, routeBreakdown, topProducts } = reportData;

  const d = new Date();
  const generatedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  let routeHtml = '';
  if (routeBreakdown && routeBreakdown.length > 0) {
    routeBreakdown.forEach(route => {
      routeHtml += `
        <tr>
          <td class="desc">${route.from_entity || 'Unknown'}</td>
          <td class="r">${formatINR(route.total_amount || 0)}</td>
        </tr>
      `;
    });
  } else {
    routeHtml = `<tr><td colspan="2" class="desc" style="text-align:center;color:#8a7a60">No route data available</td></tr>`;
  }

  let productsHtml = '';
  if (topProducts && topProducts.length > 0) {
    topProducts.forEach((product, i) => {
      productsHtml += `
        <tr>
          <td>${i + 1}</td>
          <td class="desc">${product.product_name}</td>
          <td class="r">${formatQty(product.total_qty)}</td>
        </tr>
      `;
    });
  } else {
    productsHtml = `<tr><td colspan="3" class="desc" style="text-align:center;color:#8a7a60">No product data available</td></tr>`;
  }

  const titlePrefix = type.charAt(0).toUpperCase() + type.slice(1);

  const html = `
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
          padding: 30px 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .inv-band .from {
          font-family: Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--f0d9a8);
        }
        .inv-band .arrow {
          font-size: 14px;
          letter-spacing: 1px;
          color: var(--b8a884);
          text-transform: uppercase;
          margin-top: 6px;
        }
        .inv-band .to {
          font-size: 18px;
          font-weight: 600;
          margin-top: 4px;
        }
        .inv-band .rt {
          text-align: right;
          font-size: 14px;
          color: #cdbf9f;
          line-height: 1.7;
        }
        .inv-band .rt b {
          color: var(--paper2);
        }
        .summary-blocks {
          display: flex;
          padding: 30px 40px;
          gap: 20px;
          background: #fbf5eb;
          border-bottom: 1px solid var(--d8cbb0);
        }
        .s-block {
          flex: 1;
          background: #fff;
          border: 1px solid var(--e8dec8);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .s-block .lbl {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--8a7a60);
          font-weight: 600;
          margin-bottom: 10px;
        }
        .s-block .val {
          font-size: 24px;
          font-weight: 700;
          color: var(--ink);
        }
        .sections {
          padding: 0 40px;
          display: flex;
          gap: 40px;
          margin-top: 30px;
        }
        .section {
          flex: 1;
        }
        h3 {
          font-family: Georgia, serif;
          color: var(--ink);
          font-size: 18px;
          margin-bottom: 15px;
          border-bottom: 2px solid var(--e8dec8);
          padding-bottom: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead th {
          background: #efe6d2;
          font-size: 12px;
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
          padding: 14px 18px;
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
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: var(--8a7a60);
          padding: 20px;
          border-top: 1px dashed var(--e8dec8);
        }
      </style>
    </head>
    <body>
      <div class="inv">
        <div class="inv-band">
          <div>
            <div class="from">Sugandh Mart</div>
            <div class="arrow">▾ business analytics</div>
            <div class="to">${titlePrefix} Report</div>
          </div>
          <div class="rt">
            Period <b>${dateString}</b><br>
            Generated <b>${generatedDate}</b>
          </div>
        </div>
        
        <div class="summary-blocks">
          <div class="s-block">
            <div class="lbl">Total Sales</div>
            <div class="val">${formatINR(totalSales)}</div>
          </div>
          <div class="s-block">
            <div class="lbl">Invoices Created</div>
            <div class="val">${totalInvoices}</div>
          </div>
          <div class="s-block">
            <div class="lbl">Acceptance Rate</div>
            <div class="val">${acceptanceRate}%</div>
          </div>
        </div>

        <div class="sections">
          <div class="section">
            <h3>Sales by Route</h3>
            <table>
              <thead>
                <tr>
                  <th>Route / Entity</th>
                  <th class="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${routeHtml}
              </tbody>
            </table>
          </div>
          <div class="section">
            <h3>Top Products</h3>
            <table>
              <thead>
                <tr>
                  <th style="width:40px">#</th>
                  <th>Product Name</th>
                  <th class="r">Units Sold</th>
                </tr>
              </thead>
              <tbody>
                ${productsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div class="footer">
          Auto-generated by Sugandh Mart Central Ledger System
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
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating report PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateReportPDF };
