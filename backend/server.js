const express = require('express');
const path = require('path');
require('dotenv').config();

const billsRouter = require('./routes/bills');
const invoiceRouter = require('./routes/invoice');
const dashboardRouter = require('./routes/dashboard');
const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

const cors = require('cors');
const cookieParser = require('cookie-parser');

app.use(cors());
app.use(cookieParser());

// Enable JSON payload parsing for /bill POST endpoint
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Server routes
app.use(billsRouter);
app.use(invoiceRouter);
app.use(dashboardRouter);
app.use(productsRouter);

// Serve the static counter frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));


// Global 404 Route handler for API endpoints
app.use((req, res, next) => {
  res.status(404).send('<h1>404 Not Found</h1><p>The requested page or endpoint does not exist.</p>');
});

// Global central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Exception:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Sugandh Mart Ledger System is running locally at:`);
  console.log(`http://localhost:${PORT}`);
  console.log(`==================================================`);
});
