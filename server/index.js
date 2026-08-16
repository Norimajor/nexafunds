import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import session from 'express-session'
import fs from 'fs' 

dotenv.config()

const app = express()
const isProd = process.env.NODE_ENV === 'production'

// ============================================================
// DATABASES
// ============================================================

const db = new sqlite3.Database('./database.db')
const mt5db = new sqlite3.Database('./nexafunds_mt5.db')

// ============================================================
// MIDDLEWARE
// ============================================================

// Required for secure cookies behind a proxy (Render/Railway/Nginx)
app.set('trust proxy', 1)

// credentials:true + origin:true reflects any origin. Lock it down in prod.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true) // curl / same-origin
      if (!isProd || allowedOrigins.length === 0) return cb(null, true)
      return allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)

app.use(express.json({ limit: '1mb' }))

// ============================================================
// SESSION
// ============================================================

if (isProd && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production')
}

app.use(
  session({
    name: 'nexafunds.sid',
    secret: process.env.SESSION_SECRET || 'nexafunds-development-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
)
// NOTE: the default MemoryStore leaks and resets on restart.
// For production install connect-sqlite3 and pass `store:`.

// ============================================================
// HELPERS
// ============================================================

const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' })
  }
  next()
}

// Promise wrappers so we stop nesting callbacks
const run = (database, sql, params = []) =>
  new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) reject(err)
      else resolve(this)
    })
  })

const get = (database, sql, params = []) =>
  new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  })

const all = (database, sql, params = []) =>
  new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  })

const asyncRoute = (handler) => (req, res) =>
  Promise.resolve(handler(req, res)).catch((error) => {
    console.error(`${req.method} ${req.path} failed:`, error)
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Server error' })
    }
  })

// ============================================================
// CREATE TABLES
// ============================================================

const initDatabases = async () => {
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      email TEXT UNIQUE,
      country TEXT,
      city TEXT,
      address TEXT,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  )

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
      amount REAL NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  )

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS account_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  )

  // These were MISSING in the original file -> every /api/mt5/* call failed.
  await run(
    mt5db,
    `CREATE TABLE IF NOT EXISTS mt5_account (
      login TEXT,
      balance REAL,
      equity REAL,
      profit REAL,
      margin REAL,
      free_margin REAL,
      updated_at DATETIME
    )`
  )

  await run(
    mt5db,
    `CREATE TABLE IF NOT EXISTS mt5_positions (
      ticket TEXT PRIMARY KEY,
      symbol TEXT,
      type TEXT,
      volume REAL,
      price_open REAL,
      current_price REAL,
      profit REAL,
      updated_at DATETIME
    )`
  )

  const defaultEntries = [
    ['current_balance', '6000'],
    ['total_profit', '4200'],
    ['portfolio_value', '10200'],
    ['total_invested', '6000'],
    ['ea_name', 'Nexa Gold Scalper'],
    ['ea_risk', 'Moderate'],
    ['ea_drawdown', '12'],
    ['ea_status', 'Live'],
    ['auto_trade', 'true'],
    ['push_notifications', 'true'],
    ['max_order_size', '1.5'],
    ['pamm_access', 'true'],
    ['broker_access', 'true'],
  ]

  for (const [key, value] of defaultEntries) {
    await run(
      db,
      'INSERT OR IGNORE INTO account_settings (key, value) VALUES (?, ?)',
      [key, value]
    )
  }
}
// ============================================================
// ROUTES
// ============================================================

app.get('/', (req, res) => {
  res.send('NexaFunds backend is running')
})


// ============================================================
// NFP FORECAST
// ============================================================

// Production NFP forecast data.
// This endpoint is consumed by the NexaFunds Dashboard.
//
// IMPORTANT:
// The frontend uses:
//     GET /api/nfp/latest
//
// Keep this endpoint compatible with the USDNewsAI API response.

const NFP_DATA = {
  prediction: 161.6820943737181,
  ridge: 154.48211922899213,
  random_forest: 139.6240549607354,
  gradient_boosting: 193.34010064633543,

  forecast_release_date: '2026-09-04',
  reference_month: '2026-08-01',
  information_cutoff: '2026-08-15',

  consensus: null,
  consensus_nfp: null,
  consensus_source: 'manual',
  consensus_updated_at: '2026-08-16',

  expected_surprise: null,
  surprise_percent: null,
  direction: null,
  magnitude: null,

  prediction_time: '2026-08-16',
  model: 'NFP V2 multi-indicator ensemble',
  features: 63,
  training_rows: 137,
}

// ------------------------------------------------------------
// Latest NFP endpoint
// ------------------------------------------------------------

app.get('/api/nfp/latest', (req, res) => {
  res.json({
    success: true,
    ...NFP_DATA,
  })
})

// ------------------------------------------------------------
// Backward-compatible endpoint
// ------------------------------------------------------------
//
// Keep /api/nfp working so any older NexaFunds code or other
// clients using the previous endpoint do not break.

app.get('/api/nfp', (req, res) => {
  res.json({
    success: true,
    ...NFP_DATA,
  })
})

// ---------------- REGISTER ----------------

app.post(
  '/api/register',
  asyncRoute(async (req, res) => {
    const { first_name, last_name, email, country, city, address, password } =
      req.body || {}

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: 'Email and password are required' })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const hashedPassword = await bcrypt.hash(password, 10)

    let result
    try {
      result = await run(
        db,
        `INSERT INTO users
           (first_name, last_name, email, country, city, address, password)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          first_name || '',
          last_name || '',
          normalizedEmail,
          country || '',
          city || '',
          address || '',
          hashedPassword,
        ]
      )
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res
          .status(409)
          .json({ success: false, error: 'Email already exists' })
      }
      throw err
    }

    const user = {
      id: result.lastID,
      first_name: first_name || '',
      last_name: last_name || '',
      email: normalizedEmail,
      country: country || '',
      city: city || '',
      address: address || '',
    }

    // Prevent session fixation, then log the user in
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('Session regenerate error:', regenErr)
        return res.status(500).json({
          success: false,
          error: 'Account created but login session could not be created',
        })
      }

      req.session.user = user
      req.session.save((sessionError) => {
        if (sessionError) {
          console.error('Session save error:', sessionError)
          return res.status(500).json({
            success: false,
            error: 'Account created but login session could not be created',
          })
        }
        res.status(201).json({
          success: true,
          message: 'Account created successfully',
          user,
        })
      })
    })
  })
)

// ---------------- LOGIN ----------------

app.post(
  '/api/login',
  asyncRoute(async (req, res) => {
    const { email, password } = req.body || {}
    const invalid = () =>
      res
        .status(401)
        .json({ success: false, error: 'Invalid email or password' })

    if (!email || !password) return invalid()

    const normalizedEmail = String(email).trim().toLowerCase()
    const user = await get(db, 'SELECT * FROM users WHERE email = ?', [
      normalizedEmail,
    ])

    // Always run a compare so timing doesn't reveal whether the email exists
    const hash =
      user?.password || '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinv'
    const validPassword = await bcrypt.compare(String(password), hash)

    if (!user || !validPassword) return invalid()

    const sessionUser = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      country: user.country,
      city: user.city,
      address: user.address,
    }

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error('Session regenerate error:', regenErr)
        return res.status(500).json({
          success: false,
          error: 'Login session could not be created',
        })
      }

      req.session.user = sessionUser
      req.session.save((sessionError) => {
        if (sessionError) {
          console.error('Session save error:', sessionError)
          return res.status(500).json({
            success: false,
            error: 'Login session could not be created',
          })
        }
        res.json({ success: true, message: 'Login successful', user: sessionUser })
      })
    })
  })
)

// ---------------- SESSION / LOGOUT ----------------

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.session.user })
})

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err)
      return res.status(500).json({ success: false, error: 'Failed to logout' })
    }
    res.clearCookie('nexafunds.sid')
    res.json({ success: true, message: 'Logged out successfully' })
  })
})

// ---------------- ACCOUNT SUMMARY ----------------

app.get(
  '/api/account/summary',
  requireAuth,
  asyncRoute(async (req, res) => {
    const rows = await all(
      db,
      `SELECT type, amount FROM transactions WHERE user_id = ?`,
      [req.session.user.id]
    )

    const currentBalance = rows.reduce(
      (total, row) =>
        row.type === 'deposit'
          ? total + Number(row.amount)
          : total - Number(row.amount),
      0
    )

    const totalInvested = 6000
    const totalProfit = currentBalance > 0 ? currentBalance - totalInvested : 0
    const portfolioValue = currentBalance + 4200

    res.json({
      success: true,
      summary: {
        currentBalance,
        totalProfit,
        portfolioValue,
        totalInvested,
        monthlyGain: 12.5,
        totalReturn: 48.7,
      },
    })
  })
)

// ---------------- TRANSACTIONS ----------------

app.get(
  '/api/transactions',
  requireAuth,
  asyncRoute(async (req, res) => {
    const transactions = await all(
      db,
      `SELECT id, type, amount, note, created_at
       FROM transactions
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC, id DESC`,
      [req.session.user.id]
    )
    res.json({ success: true, transactions })
  })
)

app.post(
  '/api/transactions',
  requireAuth,
  asyncRoute(async (req, res) => {
    const { type, amount, note } = req.body || {}

    if (!['deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Transaction type must be deposit or withdrawal',
      })
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, error: 'A valid amount is required' })
    }

    const result = await run(
      db,
      `INSERT INTO transactions (user_id, type, amount, note)
       VALUES (?, ?, ?, ?)`,
      [req.session.user.id, type, numericAmount, note || '']
    )

    res.status(201).json({
      success: true,
      message: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} logged successfully`,
      transaction: {
        id: result.lastID,
        type,
        amount: numericAmount,
        note: note || '',
        created_at: new Date().toISOString(),
      },
    })
  })
)

// ---------------- EA SETTINGS ----------------

app.get(
  '/api/ea/settings',
  requireAuth,
  asyncRoute(async (req, res) => {
    const rows = await all(
      db,
      `SELECT key, value FROM account_settings
       WHERE key LIKE 'ea_%'
          OR key IN ('auto_trade','push_notifications','max_order_size','pamm_access','broker_access')`
    )

    const s = Object.fromEntries(rows.map((r) => [r.key, r.value]))

    res.json({
      success: true,
      settings: {
        ea_name: s.ea_name || 'Nexa Gold Scalper',
        ea_risk: s.ea_risk || 'Moderate',
        ea_drawdown: s.ea_drawdown || '12',
        ea_status: s.ea_status || 'Live',
        auto_trade: s.auto_trade === 'true',
        push_notifications: s.push_notifications === 'true',
        max_order_size: s.max_order_size || '1.5',
        pamm_access: s.pamm_access === 'true',
        broker_access: s.broker_access === 'true',
      },
    })
  })
)

app.put(
  '/api/ea/settings',
  requireAuth,
  asyncRoute(async (req, res) => {
    const {
      ea_name,
      ea_risk,
      ea_drawdown,
      ea_status,
      auto_trade,
      push_notifications,
      max_order_size,
      pamm_access,
      broker_access,
    } = req.body || {}

    const updates = [
      ['ea_name', ea_name || 'Nexa Gold Scalper'],
      ['ea_risk', ea_risk || 'Moderate'],
      ['ea_drawdown', String(ea_drawdown ?? '12')],
      ['ea_status', ea_status || 'Live'],
      ['auto_trade', String(Boolean(auto_trade))],
      ['push_notifications', String(Boolean(push_notifications))],
      ['max_order_size', String(max_order_size ?? '1.5')],
      ['pamm_access', String(Boolean(pamm_access))],
      ['broker_access', String(Boolean(broker_access))],
    ]

    // UPSERT replaces the recursive select/insert/update callback chain
    for (const [key, value] of updates) {
      await run(
        db,
        `INSERT INTO account_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value]
      )
    }

    res.json({ success: true, message: 'EA settings updated successfully' })
  })
)

// ---------------- USERS (admin-only) ----------------

const requireAdmin = (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey || req.get('x-admin-key') !== adminKey) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  next()
}

app.get(
  '/api/users',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const rows = await all(
      db,
      `SELECT id, first_name, last_name, email, country, city, created_at
       FROM users ORDER BY id DESC`
    )
    res.json({ success: true, users: rows })
  })
)

app.get(
  '/api/stats/users',
  asyncRoute(async (req, res) => {
    const row = await get(db, 'SELECT COUNT(*) AS total FROM users')

    res.json({
      success: true,
      totalUsers: row.total || 0,
    })
  })
)

// ---------------- MT5 ----------------

app.get(
  '/api/mt5/account',
  asyncRoute(async (req, res) => {
    const account = await get(
      mt5db,
      'SELECT * FROM mt5_account ORDER BY datetime(updated_at) DESC LIMIT 1'
    )
    if (!account) {
      return res
        .status(404)
        .json({ success: false, error: 'No MT5 account data found' })
    }
    res.json({ success: true, account })
  })
)

app.get(
  '/api/mt5/positions',
  asyncRoute(async (req, res) => {
    const positions = await all(
      mt5db,
      'SELECT * FROM mt5_positions ORDER BY datetime(updated_at) DESC'
    )
    const floatingProfit = positions.reduce(
      (total, p) => total + Number(p.profit || 0),
      0
    )
    res.json({
      success: true,
      positions,
      count: positions.length,
      floatingProfit,
    })
  })
)

// Called by the MT5 EA. Protected by a shared secret, not a session.
app.post(
  '/api/mt5/update',
  asyncRoute(async (req, res) => {
    const secret = process.env.MT5_API_KEY
    if (!secret || req.get('x-mt5-key') !== secret) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const { account, positions } = req.body || {}
    if (!account || typeof account !== 'object') {
      return res
        .status(400)
        .json({ success: false, error: 'Account data is required' })
    }

    const safePositions = Array.isArray(positions) ? positions : []

    // Wrapped in a transaction so a mid-way failure can't leave the
    // tables empty (the original deleted first, then raced the inserts).
    await run(mt5db, 'BEGIN IMMEDIATE')
    try {
      await run(mt5db, 'DELETE FROM mt5_account')
      await run(
        mt5db,
        `INSERT INTO mt5_account
           (login, balance, equity, profit, margin, free_margin, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          String(account.login ?? ''),
          Number(account.balance ?? 0),
          Number(account.equity ?? 0),
          Number(account.profit ?? 0),
          Number(account.margin ?? 0),
          Number(account.free_margin ?? 0),
        ]
      )

      await run(mt5db, 'DELETE FROM mt5_positions')
      for (const p of safePositions) {
        await run(
          mt5db,
          `INSERT INTO mt5_positions
             (ticket, symbol, type, volume, price_open, current_price, profit, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            String(p.ticket ?? ''),
            String(p.symbol ?? ''),
            String(p.type ?? ''),
            Number(p.volume ?? 0),
            Number(p.price_open ?? 0),
            Number(p.current_price ?? 0),
            Number(p.profit ?? 0),
          ]
        )
      }

      await run(mt5db, 'COMMIT')
    } catch (error) {
      await run(mt5db, 'ROLLBACK').catch(() => {})
      throw error
    }

    res.json({
      success: true,
      message: 'MT5 data updated successfully',
      positions: safePositions.length,
    })
  })
)

// ============================================================
// FALLBACKS
// ============================================================

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' })
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  if (res.headersSent) return next(err)
  res.status(500).json({ success: false, error: 'Server error' })
})

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 4000

initDatabases()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`NexaFunds backend running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialise databases:', error)
    process.exit(1)
  })
