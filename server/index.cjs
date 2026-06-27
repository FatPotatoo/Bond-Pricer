const express = require('express');
const cors = require('cors');
const db = require('./db.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Math solver functions for live pricing (US 30/360)
// To keep Node server light and standalone, we import risk metrics calculations or implement a quick handler.
// Wait! The React app calculates risk metrics and duration in the client-side browser (in analyticsEngine.js).
// So the server only needs to return raw details, prices, and yields, and the client will dynamically calculate Macaulay duration, Modified duration, convexity, and DV01 in real time!
// This is incredibly elegant because it offloads mathematical load from the Node.js server!

// GET /api/bonds - Fetch all bonds with their current live quotes
app.get('/api/bonds', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.isin,
        s.name,
        s.coupon,
        s.issue_date AS issueDate,
        s.maturity_date AS maturityDate,
        s.outstanding_amount AS outstandingAmount,
        s.description,
        l.clean_price AS currentCleanPrice,
        l.ytm AS currentYTM,
        l.last_updated AS lastUpdated
      FROM securities s
      LEFT JOIN live_quotes l ON s.isin = l.isin
      ORDER BY s.maturity_date ASC
    `;
    
    const rows = await db.allAsync(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching bonds:', err.message);
    res.status(500).json({ error: 'Internal Database Error' });
  }
});

// GET /api/bonds/:isin/history - Fetch chronological daily price history for charts
app.get('/api/bonds/:isin/history', async (req, res) => {
  const { isin } = req.params;
  try {
    const query = `
      SELECT 
        quote_date AS date,
        clean_price AS cleanPrice,
        ytm
      FROM historical_quotes
      WHERE isin = ?
      ORDER BY quote_date ASC
    `;
    
    const rows = await db.allAsync(query, [isin]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No history found for specified ISIN' });
    }
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching history:', err.message);
    res.status(500).json({ error: 'Internal Database Error' });
  }
});

// POST /api/quotes - Ingestion endpoint for the python scraper (alternative to writing SQLite directly)
app.post('/api/quotes', async (req, res) => {
  const { isin, cleanPrice, ytm, lastUpdated } = req.body;
  if (!isin || cleanPrice === undefined || ytm === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  
  try {
    // 1. Update live quote
    const updatedTime = lastUpdated || new Date().toISOString();
    await db.runAsync(`
      INSERT INTO live_quotes (isin, clean_price, ytm, last_updated)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(isin) DO UPDATE SET
        clean_price = excluded.clean_price,
        ytm = excluded.ytm,
        last_updated = excluded.last_updated
    `, [isin, cleanPrice, ytm, updatedTime]);
    
    // 2. Insert into history
    const dateStr = updatedTime.split('T')[0];
    await db.runAsync(`
      INSERT INTO historical_quotes (isin, quote_date, clean_price, ytm)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(isin, quote_date) DO UPDATE SET
        clean_price = excluded.clean_price,
        ytm = excluded.ytm
    `, [isin, dateStr, cleanPrice, ytm]);
    
    res.json({ success: true, isin, cleanPrice, ytm, lastUpdated: updatedTime });
  } catch (err) {
    console.error('Error writing live quote:', err.message);
    res.status(500).json({ error: 'Internal Database Error' });
  }
});

app.listen(PORT, () => {
  console.log(`BondIQ API Server running on port ${PORT}`);
});
