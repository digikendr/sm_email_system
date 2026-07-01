const COMPANY_LABELS = {
  SFNF: 'Svar Fragrances & Flavors',
  SIPL: 'Svar International Pvt Ltd',
  SADVIK: 'Shree Sadvik Perfumery Works',
  ALEITR: 'Al Eitr',
  SM: 'Sugandh Mart'
};

const formatDateForDisplay = (date) => {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getPeriodMeta = (type, dateString) => {
  if (!['daily', 'weekly', 'monthly'].includes(type)) {
    throw new Error('Invalid report type');
  }

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid report date');
  }

  let start;
  let end;
  let label;

  if (type === 'daily') {
    start = new Date(date);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
    label = formatDateForDisplay(start);
  } else if (type === 'weekly') {
    start = new Date(date);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
    const displayEnd = new Date(end);
    displayEnd.setDate(displayEnd.getDate() - 1);
    label = `${formatDateForDisplay(start)} to ${formatDateForDisplay(displayEnd)}`;
  } else {
    start = new Date(date.getFullYear(), date.getMonth(), 1);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    label = start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  return {
    type,
    date: dateString,
    label,
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end)
  };
};

const numberValue = (value) => Number(value || 0);

const attachRouteLabels = (rows) => {
  return rows.map(row => ({
    ...row,
    route_label: COMPANY_LABELS[row.from_entity] || row.from_entity || 'Unknown'
  }));
};

const getReportAnalytics = async (db, type, dateString) => {
  const period = getPeriodMeta(type, dateString);
  const params = [period.startDate, period.endDate];
  const salesWindow = `sales.created_at >= $1::date AND sales.created_at < $2::date`;

  const [
    salesSummaryRes,
    invoiceSummaryRes,
    trendRes,
    routeBreakdownRes,
    categoryBreakdownRes,
    storeBreakdownRes,
    topProductsRes,
    itemSummaryRes,
    invoiceStatusRes,
    recentSalesRes
  ] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*)::int AS sales_count,
        COALESCE(SUM(customer_total), 0) AS total_customer_sales,
        COALESCE(AVG(customer_total), 0) AS average_bill_value
      FROM sales
      WHERE created_at >= $1::date AND created_at < $2::date
    `, params),
    db.query(`
      SELECT
        COUNT(invoices.id)::int AS total_invoices,
        COUNT(invoices.id) FILTER (WHERE invoices.status = 'accepted')::int AS accepted_count,
        COUNT(invoices.id) FILTER (WHERE invoices.status = 'pending')::int AS pending_count,
        COUNT(invoices.id) FILTER (WHERE invoices.status = 'rejected')::int AS rejected_count,
        COALESCE(SUM(invoices.amount), 0) AS invoice_subtotal,
        COALESCE(SUM(invoices.gst), 0) AS invoice_gst,
        COALESCE(SUM(invoices.grand_total), 0) AS invoice_grand_total
      FROM invoices
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${salesWindow}
    `, params),
    db.query(`
      SELECT
        date(sales.created_at) AS date,
        COALESCE(SUM(sales.customer_total), 0) AS customer_sales,
        COALESCE(SUM(invoice_totals.invoice_grand_total), 0) AS invoice_value,
        COUNT(DISTINCT sales.id)::int AS bills
      FROM sales
      LEFT JOIN (
        SELECT sale_id, SUM(grand_total) AS invoice_grand_total
        FROM invoices
        GROUP BY sale_id
      ) invoice_totals ON invoice_totals.sale_id = sales.id
      WHERE sales.created_at >= $1::date AND sales.created_at < $2::date
      GROUP BY date(sales.created_at)
      ORDER BY date ASC
    `, params),
    db.query(`
      SELECT
        invoices.from_entity,
        COUNT(DISTINCT invoices.id)::int AS invoice_count,
        COALESCE(SUM(invoices.grand_total), 0) AS total_amount
      FROM invoices
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${salesWindow}
      GROUP BY invoices.from_entity
      ORDER BY total_amount DESC
    `, params),
    db.query(`
      SELECT
        invoice_items.category,
        ROUND(COALESCE(SUM(invoice_items.qty), 0), 2) AS total_qty,
        ROUND(COALESCE(SUM(invoice_items.total), 0), 2) AS total_revenue
      FROM invoice_items
      JOIN invoices ON invoices.id = invoice_items.invoice_id
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${salesWindow}
      GROUP BY invoice_items.category
      ORDER BY total_revenue DESC
      LIMIT 12
    `, params),
    db.query(`
      SELECT
        sales.store,
        COUNT(DISTINCT sales.id)::int AS sales_count,
        COALESCE(SUM(sales.customer_total), 0) AS customer_sales,
        COALESCE(SUM(invoice_totals.invoice_grand_total), 0) AS invoice_value
      FROM sales
      LEFT JOIN (
        SELECT sale_id, SUM(grand_total) AS invoice_grand_total
        FROM invoices
        GROUP BY sale_id
      ) invoice_totals ON invoice_totals.sale_id = sales.id
      WHERE sales.created_at >= $1::date AND sales.created_at < $2::date
      GROUP BY sales.store
      ORDER BY customer_sales DESC
    `, params),
    db.query(`
      SELECT
        invoice_items.product_name,
        invoice_items.category,
        ROUND(COALESCE(SUM(invoice_items.qty), 0), 2) AS total_qty,
        ROUND(COALESCE(SUM(invoice_items.total), 0), 2) AS total_revenue
      FROM invoice_items
      JOIN invoices ON invoices.id = invoice_items.invoice_id
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${salesWindow}
      GROUP BY invoice_items.product_name, invoice_items.category
      ORDER BY total_revenue DESC, total_qty DESC
      LIMIT 15
    `, params),
    db.query(`
      SELECT ROUND(COALESCE(SUM(invoice_items.qty), 0), 2) AS total_units
      FROM invoice_items
      JOIN invoices ON invoices.id = invoice_items.invoice_id
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${salesWindow}
    `, params),
    db.query(`
      SELECT
        invoices.status,
        COUNT(*)::int AS count,
        COALESCE(SUM(invoices.grand_total), 0) AS total_amount
      FROM invoices
      JOIN sales ON sales.id = invoices.sale_id
      WHERE ${salesWindow}
      GROUP BY invoices.status
      ORDER BY invoices.status ASC
    `, params),
    db.query(`
      SELECT
        sales.id,
        sales.store,
        sales.created_at,
        sales.customer_total,
        COUNT(invoices.id)::int AS invoice_count,
        COALESCE(SUM(invoices.grand_total), 0) AS invoice_value
      FROM sales
      LEFT JOIN invoices ON invoices.sale_id = sales.id
      WHERE sales.created_at >= $1::date AND sales.created_at < $2::date
      GROUP BY sales.id
      ORDER BY sales.created_at DESC
      LIMIT 20
    `, params)
  ]);

  const salesSummary = salesSummaryRes.rows[0] || {};
  const invoiceSummary = invoiceSummaryRes.rows[0] || {};
  const totalInvoices = numberValue(invoiceSummary.total_invoices);
  const acceptedCount = numberValue(invoiceSummary.accepted_count);
  const acceptanceRate = totalInvoices > 0 ? Number(((acceptedCount / totalInvoices) * 100).toFixed(1)) : 0;
  const topProduct = topProductsRes.rows[0] || null;
  const topCategory = categoryBreakdownRes.rows[0] || null;
  const bestRoute = routeBreakdownRes.rows[0] || null;

  return {
    period,
    kpis: {
      totalCustomerSales: numberValue(salesSummary.total_customer_sales),
      averageBillValue: numberValue(salesSummary.average_bill_value),
      salesCount: numberValue(salesSummary.sales_count),
      totalInvoices,
      acceptedCount,
      pendingCount: numberValue(invoiceSummary.pending_count),
      rejectedCount: numberValue(invoiceSummary.rejected_count),
      invoiceSubtotal: numberValue(invoiceSummary.invoice_subtotal),
      invoiceGst: numberValue(invoiceSummary.invoice_gst),
      invoiceGrandTotal: numberValue(invoiceSummary.invoice_grand_total),
      acceptanceRate,
      topProduct: topProduct ? topProduct.product_name : null,
      topCategory: topCategory ? topCategory.category : null,
      bestRoute: bestRoute ? (COMPANY_LABELS[bestRoute.from_entity] || bestRoute.from_entity) : null,
      totalUnits: numberValue(itemSummaryRes.rows[0]?.total_units)
    },
    trend: trendRes.rows,
    routeBreakdown: attachRouteLabels(routeBreakdownRes.rows),
    categoryBreakdown: categoryBreakdownRes.rows,
    storeBreakdown: storeBreakdownRes.rows,
    topProducts: topProductsRes.rows,
    invoiceStatus: invoiceStatusRes.rows,
    recentSales: recentSalesRes.rows
  };
};

module.exports = {
  getReportAnalytics,
  getPeriodMeta,
  COMPANY_LABELS
};
