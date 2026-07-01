const puppeteer = require('puppeteer');

const formatINR = (n) => {
  return '₹' + (Math.round(Number(n || 0) * 100) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatQty = (n) => {
  const num = Number(n || 0);
  return Number.isInteger(num) ? num : parseFloat(num.toFixed(3));
};

const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const rowsHtml = (rows, emptyText, renderRow) => {
  if (!rows || rows.length === 0) {
    return `<tr><td colspan="5" class="empty">${escapeHtml(emptyText)}</td></tr>`;
  }
  return rows.map(renderRow).join('');
};

async function generateReportPDF(reportData) {
  const { period, kpis, routeBreakdown, categoryBreakdown, storeBreakdown, topProducts, invoiceStatus, trend } = reportData;
  const generatedDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const title = `${period.type.charAt(0).toUpperCase() + period.type.slice(1)} Business Report`;

  const maxTrend = Math.max(...trend.map(row => Number(row.customer_sales || 0)), 1);
  const maxCategory = Math.max(...categoryBreakdown.map(row => Number(row.total_revenue || 0)), 1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body {
          font-family: Inter, Arial, sans-serif;
          color: #211a14;
          margin: 0;
          background: #fff;
          font-size: 11px;
          line-height: 1.45;
        }
        .report-header {
          border-bottom: 3px solid #211a14;
          padding-bottom: 16px;
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .brand {
          font-family: Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: .2px;
        }
        .subtitle {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: #7b6b55;
          margin-top: 3px;
        }
        .meta {
          text-align: right;
          color: #6f604e;
        }
        .meta b { color: #211a14; }
        h1 {
          font-family: Georgia, serif;
          font-size: 22px;
          margin: 0 0 4px;
        }
        h2 {
          font-family: Georgia, serif;
          font-size: 15px;
          margin: 18px 0 8px;
          padding-bottom: 5px;
          border-bottom: 1px solid #d8cbb0;
        }
        .summary {
          background: #fbf5eb;
          border: 1px solid #d8cbb0;
          padding: 12px 14px;
          margin-bottom: 14px;
        }
        .summary strong { color: #211a14; }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin: 12px 0 16px;
        }
        .kpi {
          border: 1px solid #d8cbb0;
          padding: 10px;
          min-height: 72px;
          background: #fffaf0;
        }
        .kpi .label {
          color: #7b6b55;
          text-transform: uppercase;
          letter-spacing: .7px;
          font-size: 9px;
          font-weight: 700;
        }
        .kpi .value {
          font-size: 18px;
          font-weight: 800;
          margin-top: 5px;
        }
        .kpi .hint {
          color: #7b6b55;
          font-size: 10px;
          margin-top: 2px;
        }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          page-break-inside: avoid;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          page-break-inside: avoid;
        }
        th {
          background: #211a14;
          color: #f4ead7;
          text-align: left;
          padding: 7px 8px;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .7px;
        }
        td {
          padding: 7px 8px;
          border-bottom: 1px solid #eadfca;
          vertical-align: top;
        }
        .r { text-align: right; font-variant-numeric: tabular-nums; }
        .empty { text-align: center; color: #7b6b55; padding: 16px; }
        .bar-list { display: flex; flex-direction: column; gap: 7px; }
        .bar-row { display: grid; grid-template-columns: 92px 1fr 84px; gap: 8px; align-items: center; }
        .bar-track { height: 8px; background: #efe6d2; overflow: hidden; }
        .bar-fill { height: 8px; background: #9a5f12; }
        .muted { color: #7b6b55; }
        .page-break { page-break-before: always; }
        .footer {
          margin-top: 18px;
          padding-top: 10px;
          border-top: 1px solid #d8cbb0;
          color: #7b6b55;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <header class="report-header">
        <div>
          <div class="brand">Sugandh Mart</div>
          <div class="subtitle">Central Ledger Analytics</div>
        </div>
        <div class="meta">
          <h1>${escapeHtml(title)}</h1>
          Period <b>${escapeHtml(period.label)}</b><br>
          Generated <b>${escapeHtml(generatedDate)}</b>
        </div>
      </header>

      <section class="summary">
        <strong>Executive summary:</strong>
        Sugandh Mart recorded <strong>${formatINR(kpis.totalCustomerSales)}</strong> in customer sales
        across <strong>${kpis.salesCount}</strong> bills for this period. Linked chain invoices total
        <strong>${formatINR(kpis.invoiceGrandTotal)}</strong>, with an acceptance rate of
        <strong>${kpis.acceptanceRate}%</strong>.
      </section>

      <section class="kpi-grid">
        <div class="kpi"><div class="label">Customer Sales</div><div class="value">${formatINR(kpis.totalCustomerSales)}</div><div class="hint">${kpis.salesCount} retail bills</div></div>
        <div class="kpi"><div class="label">Invoice Value</div><div class="value">${formatINR(kpis.invoiceGrandTotal)}</div><div class="hint">${kpis.totalInvoices} chain invoices</div></div>
        <div class="kpi"><div class="label">Acceptance Rate</div><div class="value">${kpis.acceptanceRate}%</div><div class="hint">${kpis.acceptedCount} accepted</div></div>
        <div class="kpi"><div class="label">Average Bill</div><div class="value">${formatINR(kpis.averageBillValue)}</div><div class="hint">customer bill value</div></div>
        <div class="kpi"><div class="label">Best Route</div><div class="value" style="font-size:14px">${escapeHtml(kpis.bestRoute || '-')}</div><div class="hint">by invoice value</div></div>
        <div class="kpi"><div class="label">Top Category</div><div class="value" style="font-size:14px">${escapeHtml(kpis.topCategory || '-')}</div><div class="hint">by revenue</div></div>
        <div class="kpi"><div class="label">Top Product</div><div class="value" style="font-size:14px">${escapeHtml(kpis.topProduct || '-')}</div><div class="hint">by revenue</div></div>
        <div class="kpi"><div class="label">GST in Invoices</div><div class="value">${formatINR(kpis.invoiceGst)}</div><div class="hint">chain GST total</div></div>
      </section>

      <div class="two-col">
        <section>
          <h2>Sales Trend</h2>
          <div class="bar-list">
            ${trend.length ? trend.map(row => `
              <div class="bar-row">
                <div>${escapeHtml(String(row.date).slice(0, 10))}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (Number(row.customer_sales || 0) / maxTrend) * 100)}%"></div></div>
                <div class="r">${formatINR(row.customer_sales)}</div>
              </div>
            `).join('') : '<div class="empty">No sales recorded for this period.</div>'}
          </div>
        </section>
        <section>
          <h2>Top Categories</h2>
          <div class="bar-list">
            ${categoryBreakdown.length ? categoryBreakdown.slice(0, 8).map(row => `
              <div class="bar-row">
                <div>${escapeHtml(row.category)}</div>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (Number(row.total_revenue || 0) / maxCategory) * 100)}%"></div></div>
                <div class="r">${formatINR(row.total_revenue)}</div>
              </div>
            `).join('') : '<div class="empty">No category data for this period.</div>'}
          </div>
        </section>
      </div>

      <div class="two-col">
        <section>
          <h2>Route Performance</h2>
          <table>
            <thead><tr><th>Route</th><th class="r">Invoices</th><th class="r">Value</th></tr></thead>
            <tbody>
              ${rowsHtml(routeBreakdown, 'No route data for this period.', row => `
                <tr><td>${escapeHtml(row.route_label)}</td><td class="r">${row.invoice_count}</td><td class="r">${formatINR(row.total_amount)}</td></tr>
              `)}
            </tbody>
          </table>
        </section>
        <section>
          <h2>Store Performance</h2>
          <table>
            <thead><tr><th>Store</th><th class="r">Bills</th><th class="r">Customer Sales</th></tr></thead>
            <tbody>
              ${rowsHtml(storeBreakdown, 'No store data for this period.', row => `
                <tr><td>${escapeHtml(row.store)}</td><td class="r">${row.sales_count}</td><td class="r">${formatINR(row.customer_sales)}</td></tr>
              `)}
            </tbody>
          </table>
        </section>
      </div>

      <section class="page-break">
        <h2>Top Products</h2>
        <table>
          <thead><tr><th>#</th><th>Product</th><th>Category</th><th class="r">Qty</th><th class="r">Revenue</th></tr></thead>
          <tbody>
            ${rowsHtml(topProducts, 'No product sales for this period.', (row, i) => `
              <tr><td>${i + 1}</td><td>${escapeHtml(row.product_name)}</td><td>${escapeHtml(row.category)}</td><td class="r">${formatQty(row.total_qty)}</td><td class="r">${formatINR(row.total_revenue)}</td></tr>
            `)}
          </tbody>
        </table>

        <div class="two-col">
          <section>
            <h2>Category Breakdown</h2>
            <table>
              <thead><tr><th>Category</th><th class="r">Qty</th><th class="r">Revenue</th></tr></thead>
              <tbody>
                ${rowsHtml(categoryBreakdown, 'No category data for this period.', row => `
                  <tr><td>${escapeHtml(row.category)}</td><td class="r">${formatQty(row.total_qty)}</td><td class="r">${formatINR(row.total_revenue)}</td></tr>
                `)}
              </tbody>
            </table>
          </section>
          <section>
            <h2>Invoice Status</h2>
            <table>
              <thead><tr><th>Status</th><th class="r">Invoices</th><th class="r">Value</th></tr></thead>
              <tbody>
                ${rowsHtml(invoiceStatus, 'No invoices for this period.', row => `
                  <tr><td>${escapeHtml(row.status)}</td><td class="r">${row.count}</td><td class="r">${formatINR(row.total_amount)}</td></tr>
                `)}
              </tbody>
            </table>
          </section>
        </div>
      </section>

      <div class="footer">
        <span>Auto-generated by Sugandh Mart Central Ledger System</span>
        <span>${escapeHtml(period.label)}</span>
      </div>
    </body>
    </html>
  `;

  let browser;
  try {
    const launchOptions = {
      headless: 'new',
      dumpio: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process'
      ]
    };
    
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { generateReportPDF, formatINR, formatQty };
