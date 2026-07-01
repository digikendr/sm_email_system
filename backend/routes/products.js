const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/api/gst-rates', async (req, res) => {
    try {
        const result = await db.query('SELECT from_entity, to_entity, gst_rate FROM gst_rates');
        res.json({ success: true, rates: result.rows });
    } catch (err) {
        console.error('Error fetching gst rates:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/api/products', async (req, res) => {
    try {
        const { category } = req.query;
        const values = [];
        let whereClause = '';

        if (category && category !== 'All') {
            values.push(category);
            whereClause = 'WHERE cat = $1';
        }

        const result = await db.query(`SELECT * FROM products ${whereClause} ORDER BY name ASC`, values);
        // We cast numeric fields to numbers to maintain compatibility with the frontend structure
        const products = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            wt: row.wt,
            cat: row.cat,
            route: row.route,
            ppk: row.ppk ? Number(row.ppk) : null,
            sfnf: row.sfnf ? Number(row.sfnf) : null,
            upper: row.upper ? Number(row.upper) : null,
            sm: row.sm ? Number(row.sm) : null,
            sell: row.sell ? Number(row.sell) : null,
            mrp: row.mrp ? Number(row.mrp) : null
        }));
        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/api/product-categories', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DISTINCT cat
            FROM products
            WHERE cat IS NOT NULL AND TRIM(cat) <> ''
            ORDER BY cat ASC
        `);
        res.json(result.rows.map(row => row.cat));
    } catch (err) {
        console.error('Error fetching product categories:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update product prices
router.put('/api/products/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { ppk, sfnf, upper, sm, sell, mrp } = req.body;
        
        // Validation (make sure id is a number)
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const query = `
            UPDATE products 
            SET ppk = $1, sfnf = $2, upper = $3, sm = $4, sell = $5, mrp = $6
            WHERE id = $7
            RETURNING *;
        `;
        
        const values = [
            ppk !== undefined && ppk !== '' ? Number(ppk) : null,
            sfnf !== undefined && sfnf !== '' ? Number(sfnf) : null,
            upper !== undefined && upper !== '' ? Number(upper) : null,
            sm !== undefined && sm !== '' ? Number(sm) : null,
            sell !== undefined && sell !== '' ? Number(sell) : null,
            mrp !== undefined && mrp !== '' ? Number(mrp) : null,
            id
        ];

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ success: true, product: result.rows[0] });
    } catch (err) {
        console.error('Error updating product:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
