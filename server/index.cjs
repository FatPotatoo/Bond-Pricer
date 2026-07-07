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
    const user = await db.getAsync('SELECT cash_balance, reserved_balance FROM users WHERE id = ?', [req.user.userId]);
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
      reservedBalance: user.reserved_balance,
      holdings
    });
  } catch (err) {
    console.error('Error fetching portfolio:', err.message);
    res.status(500).json({ error: 'Internal Database Error fetching portfolio' });
  }
});

// Helper to determine G-Sec active market hours in IST (9 AM - 5 PM, Mon-Fri)
const isMarketOpenIST = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5)); // +5:30 offset
  
  const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;
  
  const hour = ist.getHours();
  if (hour >= 9 && hour < 17) return true;
  return false;
};

// POST /api/orders - Submit trading quotes (Bids or Asks)
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { isin, orderType, price, quantity } = req.body;
  const userId = req.user.userId;

  if (!isin || !orderType || !price || price <= 0 || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Missing or invalid parameters' });
  }

  if (orderType !== 'BUY' && orderType !== 'SELL') {
    return res.status(400).json({ error: 'Invalid order type (must be BUY or SELL)' });
  }

  try {
    const security = await db.getAsync('SELECT name FROM securities WHERE isin = ?', [isin]);
    if (!security) return res.status(404).json({ error: 'Security not found' });

    const totalCost = quantity * price;
    const createdAt = new Date().toISOString();

    if (orderType === 'BUY') {
      const user = await db.getAsync('SELECT cash_balance FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (user.cash_balance < totalCost) {
        return res.status(400).json({ error: `Insufficient cash. Total cost: ₹${totalCost.toLocaleString()}, Cash balance: ₹${user.cash_balance.toLocaleString()}` });
      }

      // Move cash to escrow
      await db.runAsync('UPDATE users SET cash_balance = cash_balance - ?, reserved_balance = reserved_balance + ? WHERE id = ?', [totalCost, totalCost, userId]);

      // Insert pending buy quote
      await db.runAsync(`
        INSERT INTO orders (user_id, isin, order_type, price, quantity, status, created_at)
        VALUES (?, ?, 'BUY', ?, ?, 'PENDING', ?)
      `, [userId, isin, price, quantity, createdAt]);

      return res.json({ success: true, message: `Buy Quote of ${quantity.toLocaleString()} lots listed successfully at ₹${price.toFixed(4)}` });
    } else {
      // SELL ORDER
      const holding = await db.getAsync('SELECT quantity FROM portfolios WHERE user_id = ? AND isin = ?', [userId, isin]);
      
      const pendingSells = await db.getAsync(`
        SELECT SUM(quantity) AS total FROM orders 
        WHERE user_id = ? AND isin = ? AND order_type = 'SELL' AND status = 'PENDING'
      `, [userId, isin]);
      
      const pendingQty = pendingSells && pendingSells.total ? pendingSells.total : 0;
      const availableQty = holding ? (holding.quantity - pendingQty) : 0;

      if (availableQty < quantity) {
        return res.status(400).json({ error: `Insufficient bond holdings. Available: ${availableQty.toLocaleString()}, Requested: ${quantity.toLocaleString()}` });
      }

      // Insert pending sell quote
      await db.runAsync(`
        INSERT INTO orders (user_id, isin, order_type, price, quantity, status, created_at)
        VALUES (?, ?, 'SELL', ?, ?, 'PENDING', ?)
      `, [userId, isin, price, quantity, createdAt]);

      return res.json({ success: true, message: `Sell Quote of ${quantity.toLocaleString()} lots listed successfully at ₹${price.toFixed(4)}` });
    }
  } catch (err) {
    console.error('Order creation error:', err.message);
    res.status(500).json({ error: 'Internal Database Error during quote placement' });
  }
});

// GET /api/market/orders - Public Marketplace Board listings (all active pending orders)
app.get('/api/market/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await db.allAsync(`
      SELECT o.id, o.user_id AS userId, u.username, o.isin, s.name, o.order_type AS orderType, o.price, o.quantity, o.created_at AS createdAt
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN securities s ON o.isin = s.isin
      WHERE o.status = 'PENDING'
      ORDER BY o.price DESC, o.created_at ASC
    `);
    res.json(orders);
  } catch (err) {
    console.error('Fetch market orders error:', err.message);
    res.status(500).json({ error: 'Internal Database Error fetching global orders book' });
  }
});

// POST /api/orders/:id/accept - Accept a student listing (Direct P2P Settlement)
app.post('/api/orders/:id/accept', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const currentUserId = req.user.userId;

  try {
    const order = await db.getAsync('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ error: 'Listing not found' });
    if (order.status !== 'PENDING') return res.status(400).json({ error: 'This listing is no longer active' });
    
    if (order.user_id === currentUserId) {
      return res.status(400).json({ error: 'You cannot accept your own listing!' });
    }

    const orderCreatorId = order.user_id;
    const isin = order.isin;
    const price = order.price;
    const quantity = order.quantity;
    const totalValue = quantity * price;
    const executedAt = new Date().toISOString();

    if (order.order_type === 'BUY') {
      // Creator (A) is buying. Current User (B) is selling.
      const sellerHolding = await db.getAsync('SELECT quantity FROM portfolios WHERE user_id = ? AND isin = ?', [currentUserId, isin]);
      
      const pendingSells = await db.getAsync(`
        SELECT SUM(quantity) AS total FROM orders 
        WHERE user_id = ? AND isin = ? AND order_type = 'SELL' AND status = 'PENDING'
      `, [currentUserId, isin]);
      const pendingQty = pendingSells && pendingSells.total ? pendingSells.total : 0;
      const sellerAvailableQty = sellerHolding ? (sellerHolding.quantity - pendingQty) : 0;

      if (sellerAvailableQty < quantity) {
        return res.status(400).json({ error: `Insufficient holdings. You need ${quantity.toLocaleString()} units to fill this buy order.` });
      }

      // Execute P2P Settlement
      // Buyer: Creator gets cash balance updated (deduct from escrow reserved)
      await db.runAsync('UPDATE users SET reserved_balance = reserved_balance - ? WHERE id = ?', [totalValue, orderCreatorId]);
      
      // Seller: Current User gets paid cash
      await db.runAsync('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [totalValue, currentUserId]);

      // Seller G-Sec Transfer
      if (sellerHolding.quantity === quantity) {
        await db.runAsync('DELETE FROM portfolios WHERE user_id = ? AND isin = ?', [currentUserId, isin]);
      } else {
        await db.runAsync('UPDATE portfolios SET quantity = quantity - ? WHERE user_id = ? AND isin = ?', [quantity, currentUserId, isin]);
      }

      // Buyer G-Sec Transfer
      const buyerHolding = await db.getAsync('SELECT quantity, average_buy_price FROM portfolios WHERE user_id = ? AND isin = ?', [orderCreatorId, isin]);
      if (buyerHolding) {
        const newQty = buyerHolding.quantity + quantity;
        const newAvg = ((buyerHolding.quantity * buyerHolding.average_buy_price) + totalValue) / newQty;
        await db.runAsync('UPDATE portfolios SET quantity = ?, average_buy_price = ? WHERE user_id = ? AND isin = ?', [newQty, newAvg, orderCreatorId, isin]);
      } else {
        await db.runAsync('INSERT INTO portfolios (user_id, isin, quantity, average_buy_price) VALUES (?, ?, ?, ?)', [orderCreatorId, isin, quantity, price]);
      }

      // Mark filled
      await db.runAsync("UPDATE orders SET status = 'FILLED', executed_at = ? WHERE id = ?", [executedAt, orderId]);

      // Log P2P Transaction
      await db.runAsync(`
        INSERT INTO transactions (buyer_id, seller_id, order_id, isin, execution_price, quantity, total_value, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [orderCreatorId, currentUserId, orderId, isin, price, quantity, totalValue, executedAt]);

      return res.json({ success: true, message: `Successfully filled Student Quote Buy. Sold ${quantity.toLocaleString()} lots at ₹${price.toFixed(4)}` });

    } else {
      // Creator (A) is selling. Current User (B) is buying.
      const buyerUser = await db.getAsync('SELECT cash_balance FROM users WHERE id = ?', [currentUserId]);
      if (!buyerUser || buyerUser.cash_balance < totalValue) {
        return res.status(400).json({ error: `Insufficient cash. Total cost: ₹${totalValue.toLocaleString()}, Cash balance: ₹${buyerUser.cash_balance.toLocaleString()}` });
      }

      // Execute P2P Settlement
      // Buyer: Current User gets cash deducted
      await db.runAsync('UPDATE users SET cash_balance = cash_balance - ? WHERE id = ?', [totalValue, currentUserId]);
      
      // Seller: Creator gets cash credited
      await db.runAsync('UPDATE users SET cash_balance = cash_balance + ? WHERE id = ?', [totalValue, orderCreatorId]);

      // Seller G-Sec Transfer
      const sellerHolding = await db.getAsync('SELECT quantity FROM portfolios WHERE user_id = ? AND isin = ?', [orderCreatorId, isin]);
      if (sellerHolding.quantity === quantity) {
        await db.runAsync('DELETE FROM portfolios WHERE user_id = ? AND isin = ?', [orderCreatorId, isin]);
      } else {
        await db.runAsync('UPDATE portfolios SET quantity = quantity - ? WHERE user_id = ? AND isin = ?', [quantity, orderCreatorId, isin]);
      }

      // Buyer G-Sec Transfer
      const buyerHolding = await db.getAsync('SELECT quantity, average_buy_price FROM portfolios WHERE user_id = ? AND isin = ?', [currentUserId, isin]);
      if (buyerHolding) {
        const newQty = buyerHolding.quantity + quantity;
        const newAvg = ((buyerHolding.quantity * buyerHolding.average_buy_price) + totalValue) / newQty;
        await db.runAsync('UPDATE portfolios SET quantity = ?, average_buy_price = ? WHERE user_id = ? AND isin = ?', [newQty, newAvg, currentUserId, isin]);
      } else {
        await db.runAsync('INSERT INTO portfolios (user_id, isin, quantity, average_buy_price) VALUES (?, ?, ?, ?)', [currentUserId, isin, quantity, price]);
      }

      // Mark filled
      await db.runAsync("UPDATE orders SET status = 'FILLED', executed_at = ? WHERE id = ?", [executedAt, orderId]);

      // Log P2P Transaction
      await db.runAsync(`
        INSERT INTO transactions (buyer_id, seller_id, order_id, isin, execution_price, quantity, total_value, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [currentUserId, orderCreatorId, orderId, isin, price, quantity, totalValue, executedAt]);

      return res.json({ success: true, message: `Successfully filled Student Quote Sell. Purchased ${quantity.toLocaleString()} lots at ₹${price.toFixed(4)}` });
    }
  } catch (err) {
    console.error('Accept trade error:', err.message);
    res.status(500).json({ error: 'Internal Database Error during trade settlement' });
  }
});

// GET /api/orders - Get user's orders and transaction history logs
app.get('/api/orders', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const pending = await db.allAsync(`
      SELECT o.id, o.isin, s.name, o.order_type AS orderType, o.price, o.quantity, o.created_at AS createdAt
      FROM orders o
      JOIN securities s ON o.isin = s.isin
      WHERE o.user_id = ? AND o.status = 'PENDING'
      ORDER BY o.id DESC
    `, [userId]);

    const history = await db.allAsync(`
      SELECT 
        t.id, 
        t.isin, 
        s.name, 
        CASE WHEN t.buyer_id = ? THEN 'BUY' ELSE 'SELL' END AS tradeType,
        t.execution_price AS executionPrice, 
        t.quantity, 
        t.total_value AS totalValue, 
        t.executed_at AS executedAt,
        CASE WHEN t.buyer_id = ? THEN u_sel.username ELSE u_buy.username END AS counterparty
      FROM transactions t
      JOIN securities s ON t.isin = s.isin
      JOIN users u_buy ON t.buyer_id = u_buy.id
      JOIN users u_sel ON t.seller_id = u_sel.id
      WHERE t.buyer_id = ? OR t.seller_id = ?
      ORDER BY t.id DESC
    `, [userId, userId, userId, userId]);

    res.json({ pending, history });
  } catch (err) {
    console.error('Fetch orders error:', err.message);
    res.status(500).json({ error: 'Internal Database Error fetching orders' });
  }
});

// POST /api/orders/:id/cancel - Cancel pending personal listing
app.post('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.userId;

  try {
    const order = await db.getAsync('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });
    }

    // Cancel order
    await db.runAsync("UPDATE orders SET status = 'CANCELLED' WHERE id = ?", [orderId]);

    // Refund reserved buy cash
    if (order.order_type === 'BUY') {
      const reservedCost = order.quantity * order.price;
      await db.runAsync('UPDATE users SET cash_balance = cash_balance + ?, reserved_balance = reserved_balance - ? WHERE id = ?', [reservedCost, reservedCost, userId]);
    }

    res.json({ success: true, message: 'Order listing cancelled successfully' });
  } catch (err) {
    console.error('Cancel order error:', err.message);
    res.status(500).json({ error: 'Internal Database Error cancelling order' });
  }
});

app.listen(PORT, () => {
  console.log(`BondIQ API Server running on port ${PORT}`);
  startAutoIngestion();
});

const { exec } = require('child_process');
const path = require('path');

function startAutoIngestion() {
  const scraperPath = path.join(__dirname, '../scripts/liveIngestion.py');
  console.log(`[Auto-Scheduler]: Ingestion loop initialized. Triggering scripts/liveIngestion.py every 30 seconds.`);
  
  runScraper(scraperPath);

  setInterval(() => {
    runScraper(scraperPath);
  }, 30000);
}

function runScraper(scriptPath) {
  exec(`python "${scriptPath}" --force`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Auto-Scheduler Error]: ${error.message}`);
      return;
    }
    const output = stdout.trim();
    if (output) {
      if (output.includes('successfully') || output.includes('updated')) {
        console.log(`[Auto-Scheduler Ingest]: ${output}`);
      }
    }
  });
}

