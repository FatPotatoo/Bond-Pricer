const fs = require('fs');
const path = require('path');
const vm = require('vm');
const db = require('./db.cjs');

// Mathematical YTM solver inside Node for seeder calculations
function solveYTMFromCleanPrice(cleanPrice, settlementStr, maturityStr, issueStr, couponRate) {
  // Simple approximation solver for seeding
  const settlement = new Date(settlementStr);
  const maturity = new Date(maturityStr);
  const timeToMaturity = (maturity - settlement) / (365 * 24 * 60 * 60 * 1000);
  
  if (timeToMaturity <= 0) return 0.0;
  
  // Approximate yield formula
  // YTM = (C + (F - P)/T) / ((F + P)/2)
  const annualCoupon = 100 * couponRate;
  const num = annualCoupon + (100 - cleanPrice) / timeToMaturity;
  const den = (100 + cleanPrice) / 2.0;
  let approx = num / den;
  
  return approx > 0 ? approx : 0.065; // fallback to 6.5% standard
}

async function seed() {
  console.log('Initializing database seeding...');
  
  // 1. Load securities list dynamically from securityMaster.js
  const masterPath = path.join(__dirname, '../src/data/securityMaster.js');
  if (!fs.existsSync(masterPath)) {
    console.error('Master security file not found at:', masterPath);
    process.exit(1);
  }
  
  let code = fs.readFileSync(masterPath, 'utf8');
  // Strip ES Module keywords and imports so it runs in Node's VM context
  code = code.replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '');
  code = code.replace(/export\s+/g, '');
  code = code.replace(/const\s+staticBondsList\s*=/g, 'global.staticBondsList =');
  code = code.replace(/function\s+generateHistoricalData[\s\S]*?\n}/g, '');
  code = code.replace(/const\s+bondsData\s*=[\s\S]*/g, '');

  const sandbox = { global: {} };
  vm.createContext(sandbox);
  try {
    vm.runInContext(code, sandbox);
  } catch (err) {
    console.error('Error executing securityMaster code in sandbox:', err.message);
    process.exit(1);
  }
  
  const staticBondsList = sandbox.global.staticBondsList;
  if (!staticBondsList || !Array.isArray(staticBondsList)) {
    console.error('Failed to parse staticBondsList array.');
    process.exit(1);
  }
  
  console.log(`Parsed ${staticBondsList.length} static G-Sec records from ES module.`);
  
  // 2. Setup SQLite tables
  await db.runAsync('DROP TABLE IF EXISTS transactions');
  await db.runAsync('DROP TABLE IF EXISTS orders');
  await db.runAsync('DROP TABLE IF EXISTS portfolios');
  await db.runAsync('DROP TABLE IF EXISTS users');
  await db.runAsync('DROP TABLE IF EXISTS live_quotes');
  await db.runAsync('DROP TABLE IF EXISTS historical_quotes');
  await db.runAsync('DROP TABLE IF EXISTS securities');
  
  await db.runAsync(`
    CREATE TABLE securities (
      isin TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      coupon REAL NOT NULL,
      issue_date TEXT NOT NULL,
      maturity_date TEXT NOT NULL,
      outstanding_amount REAL NOT NULL,
      description TEXT
    )
  `);
  
  await db.runAsync(`
    CREATE TABLE live_quotes (
      isin TEXT PRIMARY KEY,
      clean_price REAL NOT NULL,
      ytm REAL NOT NULL,
      last_updated TEXT NOT NULL,
      FOREIGN KEY (isin) REFERENCES securities (isin) ON DELETE CASCADE
    )
  `);
  
  await db.runAsync(`
    CREATE TABLE historical_quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isin TEXT NOT NULL,
      quote_date TEXT NOT NULL,
      clean_price REAL NOT NULL,
      ytm REAL NOT NULL,
      UNIQUE(isin, quote_date),
      FOREIGN KEY (isin) REFERENCES securities (isin) ON DELETE CASCADE
    )
  `);
  
  await db.runAsync(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      cash_balance REAL NOT NULL DEFAULT 10000000.0,
      reserved_balance REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL
    )
  `);
  
  await db.runAsync(`
    CREATE TABLE portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      isin TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      average_buy_price REAL NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (isin) REFERENCES securities (isin) ON DELETE CASCADE
    )
  `);

  await db.runAsync(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      isin TEXT NOT NULL,
      order_type TEXT NOT NULL, -- BUY, SELL
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL, -- PENDING, FILLED, CANCELLED
      created_at TEXT NOT NULL,
      executed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (isin) REFERENCES securities (isin) ON DELETE CASCADE
    )
  `);

  await db.runAsync(`
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      isin TEXT NOT NULL,
      execution_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total_value REAL NOT NULL,
      executed_at TEXT NOT NULL,
      FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (isin) REFERENCES securities (isin) ON DELETE CASCADE
    )
  `);
  
  console.log('Database tables created successfully.');
  
  // 3. Seed Securities & Baseline Quotes
  const BASELINE_DATE = '2026-06-25';
  
  for (const b of staticBondsList) {
    // Insert security metadata
    await db.runAsync(`
      INSERT INTO securities (isin, name, coupon, issue_date, maturity_date, outstanding_amount, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      b.isin,
      b.name,
      b.coupon,
      b.issueDate,
      b.maturityDate,
      b.outstandingAmount,
      b.description || 'Central Government Dated Security (Fixed Rate)'
    ]);
    
    // Calculate solved baseline yield
    const solvedYTM = solveYTMFromCleanPrice(
      b.baselineCleanPrice,
      BASELINE_DATE,
      b.maturityDate,
      b.issueDate,
      b.coupon
    );
    
    // Insert initial live quote
    await db.runAsync(`
      INSERT INTO live_quotes (isin, clean_price, ytm, last_updated)
      VALUES (?, ?, ?, ?)
    `, [
      b.isin,
      b.baselineCleanPrice,
      solvedYTM,
      `${BASELINE_DATE}T15:45:00+05:30`
    ]);
    
    // Seed 30 days of mock history for charts
    let currentPrice = b.baselineCleanPrice;
    let currentYTM = solvedYTM;
    
    // Seed index code-based pseudo random seed
    let seedVal = 0;
    for (let i = 0; i < b.isin.length; i++) {
      seedVal += b.isin.charCodeAt(i);
    }
    
    function pseudoRandom() {
      const x = Math.sin(seedVal++) * 10000;
      return x - Math.floor(x);
    }
    
    const startDay = new Date(BASELINE_DATE);
    const historyRows = [];
    
    for (let day = 0; day < 30; day++) {
      const date = new Date(startDay);
      const calendarDaysAgo = Math.floor(day * 7 / 5);
      date.setDate(startDay.getDate() - calendarDaysAgo);
      
      // Skip weekends to resemble actual market close
      if (date.getDay() === 0) date.setDate(date.getDate() - 2);
      else if (date.getDay() === 6) date.setDate(date.getDate() - 1);
      
      const dateStr = date.toISOString().split('T')[0];
      
      // Random walk price movements
      const change = (pseudoRandom() - 0.49) * 0.08; 
      currentPrice = currentPrice + change;
      currentPrice = Math.max(50, Math.min(150, currentPrice));
      
      currentYTM = solveYTMFromCleanPrice(
        currentPrice,
        dateStr,
        b.maturityDate,
        b.issueDate,
        b.coupon
      );
      
      historyRows.push({
        dateStr,
        price: parseFloat(currentPrice.toFixed(4)),
        ytm: parseFloat(currentYTM.toFixed(6))
      });
    }
    
    // Sort chronological and insert
    historyRows.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
    
    for (const r of historyRows) {
      await db.runAsync(`
        INSERT OR IGNORE INTO historical_quotes (isin, quote_date, clean_price, ytm)
        VALUES (?, ?, ?, ?)
      `, [b.isin, r.dateStr, r.price, r.ytm]);
    }
  }
  
  console.log(`Seeded metadata, live quotes, and 30-day historical points for all ${staticBondsList.length} securities.`);
  db.close();
  console.log('Seeder process completed successfully.');
}

seed().catch(err => {
  console.error('Error during database seeding:', err.message);
  process.exit(1);
});
