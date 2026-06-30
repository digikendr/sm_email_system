-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    store TEXT NOT NULL,
    date DATE NOT NULL,
    customer_total NUMERIC NOT NULL,
    gst_on BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    from_entity TEXT NOT NULL,
    to_entity TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    gst NUMERIC NOT NULL,
    grand_total NUMERIC NOT NULL,
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    emailed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    pdf_url TEXT
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    weight TEXT,
    qty NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    hsn TEXT
);

-- Create indexes for fast lookup and relational integrity
CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_token ON invoices(token);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_from_entity ON invoices(from_entity);

-- Create reports table for storing auto-generated pdfs
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
    report_date DATE NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_type_date ON reports(report_type, report_date);

-- Indexes for performance on dashboard analytics
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    wt TEXT,
    cat TEXT,
    route TEXT,
    ppk NUMERIC,
    sfnf NUMERIC,
    upper NUMERIC,
    sm NUMERIC,
    sell NUMERIC,
    mrp NUMERIC
);

-- Create gst_rates table
CREATE TABLE IF NOT EXISTS gst_rates (
    id BIGSERIAL PRIMARY KEY,
    from_entity TEXT NOT NULL,
    to_entity TEXT NOT NULL,
    gst_rate NUMERIC NOT NULL,
    UNIQUE(from_entity, to_entity)
);