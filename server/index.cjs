const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db.cjs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bondiq_secret_key_2026';

app.use(cors());
app.use(express.json());

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

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
// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.getAsync('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    // Insert user (default cash balance ₹1 Crore)
    await db.runAsync(`
      INSERT INTO users (username, password_hash, cash_balance, created_at)
      VALUES (?, ?, 10000000.0, ?)
    `, [username, passwordHash, createdAt]);
    
    // Retrieve inserted user ID
    const user = await db.getAsync('SELECT id, username FROM users WHERE username = ?', [username]);
    const userId = user.id;

    // Generate ₹1 Crore starting portfolio (allocate ~₹9,500,000 across 4 random G-Secs)
    const allQuotes = await db.allAsync(`
      SELECT s.isin, l.clean_price 
      FROM securities s 
      JOIN live_quotes l ON s.isin = l.isin
      WHERE l.clean_price > 0
    `);

    if (allQuotes.length >= 4) {
      // Shuffle quotes list to pick 4 random ones
      const shuffled = allQuotes.sort(() => 0.5 - Math.random());
      const selectedBonds = shuffled.slice(0, 4);

      const targetValuePerBond = 2375000.0; // ₹9,500,000 / 4
      let totalSpent = 0;

      for (const bond of selectedBonds) {
        const cleanPrice = bond.clean_price;
        // 1 unit = ₹100 face value. Price per unit is cleanPrice.
        const quantity = Math.floor(targetValuePerBond / cleanPrice);
        const cost = quantity * cleanPrice;
        totalSpent += cost;

        await db.runAsync(`
          INSERT INTO portfolios (user_id, isin, quantity, average_buy_price)
          VALUES (?, ?, ?, ?)
        `, [userId, bond.isin, quantity, cleanPrice]);
      }

      // Update cash balance with remainder
      const finalCash = 10000000.0 - totalSpent;
      await db.runAsync('UPDATE users SET cash_balance = ? WHERE id = ?', [finalCash, userId]);
    }

    // Generate Token
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, username });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Internal Database Error during registration' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal Database Error during login' });
  }
});

// GET /api/portfolio
app.get('/api/portfolio', authenticateToken, async (req, res) => {
  try {
    const user = await db.getAsync('SELECT cash_balance FROM users WHERE id = ?', [req.user.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const holdings = await db.allAsync(`
      SELECT 
        p.isin,
        s.name,
        p.quantity,
        p.average_buy_price AS averageBuyPrice,
        l.clean_price AS currentPrice,
        l.ytm AS currentYTM
      FROM portfolios p
      JOIN securities s ON p.isin = s.isin
      JOIN live_quotes l ON p.isin = l.isin
      WHERE p.user_id = ?
    `, [req.user.userId]);

    res.json({
      cashBalance: user.cash_balance,
      holdings
    });
  } catch (err) {
    console.error('Error fetching portfolio:', err.message);
    res.status(500).json({ error: 'Internal Database Error fetching portfolio' });
  }
});
app.listen(PORT, () => {
  console.log(`BondIQ API Server running on port ${PORT}`);
  
  // Start the background auto-ingest schedule
  startAutoIngestion();
});

const { exec } = require('child_process');
const path = require('path');

function startAutoIngestion() {
  const scraperPath = path.join(__dirname, '../scripts/liveIngestion.py');
  console.log(`[Auto-Scheduler]: Ingestion loop initialized. Triggering scripts/liveIngestion.py every 30 seconds.`);
  
  // Trigger immediately on startup
  runScraper(scraperPath);

  // Poll every 30 seconds
  setInterval(() => {
    runScraper(scraperPath);
  }, 30000);
}

function runScraper(scriptPath) {
  exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Auto-Scheduler Error]: ${error.message}`);
      return;
    }
    const output = stdout.trim();
    if (output) {
      // Print only successful price updates to avoid terminal log noise
      if (output.includes('successfully') || output.includes('updated')) {
        console.log(`[Auto-Scheduler Ingest]: ${output}`);
      }
    }
  });
}

