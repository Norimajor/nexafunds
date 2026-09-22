import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import session from 'express-session'
import fs from 'fs' 
import path from 'path'
import { fileURLToPath } from 'url'
import strategyRouter from './routes/strategy.js'

dotenv.config()

const app = express()
const isProd = process.env.NODE_ENV === 'production'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_DIR = path.resolve(__dirname, '../dist')

// ============================================================
// DATABASES
// ============================================================

const db = new sqlite3.Database('./database.db')
const mt5db = new sqlite3.Database('./nexafunds_mt5.db')
const PERFORMANCE_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000
const EA_HEARTBEAT_TIMEOUT_MS = 30 * 1000

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

const normalizeStatus = (value) => {
  const status = String(value || '').trim().toLowerCase()
  if (['offline', 'disconnected', 'stopped', 'inactive'].includes(status)) return 'OFFLINE'
  if (['error', 'fault'].includes(status)) return 'ERROR'
  return 'LIVE'
}

const readEaTelemetry = (body) => {
  const telemetry = body?.ea || body?.ea_telemetry || body?.telemetry || {}
  const name = String(telemetry.name || telemetry.ea_name || body?.ea_name || '').trim()
  const version = String(telemetry.version || telemetry.ea_version || body?.ea_version || '').trim()
  const explicitStatus = telemetry.status || telemetry.state || body?.ea_status
  const heartbeat = telemetry.last_seen || telemetry.heartbeat || telemetry.timestamp || body?.ea_last_seen
  const parsedHeartbeat = heartbeat ? new Date(heartbeat) : new Date()

  return {
    provided: Boolean(name || version || explicitStatus || heartbeat),
    name,
    version,
    status: explicitStatus ? normalizeStatus(explicitStatus) : 'LIVE',
    lastSeen: Number.isNaN(parsedHeartbeat.getTime()) ? new Date().toISOString() : parsedHeartbeat.toISOString(),
  }
}

const recordJournalEvent = async (event) => {
  await run(
    mt5db,
    `INSERT OR IGNORE INTO mt5_journal
      (event_key, event_type, symbol, side, volume, ticket, entry_price, exit_price, profit, ea_name, ea_version, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      event.eventKey,
      event.eventType,
      event.symbol || null,
      event.side || null,
      event.volume == null ? null : Number(event.volume),
      event.ticket || null,
      event.entryPrice == null ? null : Number(event.entryPrice),
      event.exitPrice == null ? null : Number(event.exitPrice),
      event.profit == null ? null : Number(event.profit),
      event.eaName || null,
      event.eaVersion || null,
      JSON.stringify(event.details || {}),
    ]
  )
}

const isStaleHeartbeat = (lastSeen) => {
  const timestamp = new Date(lastSeen).getTime()
  return !Number.isFinite(timestamp) || Date.now() - timestamp > EA_HEARTBEAT_TIMEOUT_MS
}

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

  await run(
    mt5db,
    `CREATE TABLE IF NOT EXISTS mt5_ea_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      version TEXT,
      status TEXT NOT NULL,
      last_seen DATETIME,
      updated_at DATETIME NOT NULL
    )`
  )

  await run(
    mt5db,
    `CREATE TABLE IF NOT EXISTS mt5_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_key TEXT UNIQUE NOT NULL,
      event_type TEXT NOT NULL,
      symbol TEXT,
      side TEXT,
      volume REAL,
      ticket TEXT,
      entry_price REAL,
      exit_price REAL,
      profit REAL,
      ea_name TEXT,
      ea_version TEXT,
      details TEXT,
      created_at DATETIME NOT NULL
    )`
  )

  await run(
    mt5db,
    `CREATE TABLE IF NOT EXISTS mt5_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance REAL NOT NULL,
      equity REAL NOT NULL,
      profit REAL NOT NULL,
      captured_at DATETIME NOT NULL
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

// ============================================================
// NFP FORECAST
// ============================================================

// USDNewsAI owns the NFP model and reads the latest prediction and consensus
// files. NexaFunds keeps the public route stable and proxies the live payload.
const USDNEWS_AI_API_URL = (process.env.USDNEWS_AI_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const USDNEWS_AI_TIMEOUT_MS = Number(process.env.USDNEWS_AI_TIMEOUT_MS || 10000)

const fetchLatestNfp = async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), USDNEWS_AI_TIMEOUT_MS)

  try {
    const response = await fetch(`${USDNEWS_AI_API_URL}/api/nfp/latest`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    const data = await response.json().catch(() => null)

    if (!response.ok || !data || data.error) {
      const detail = data?.error || `USDNewsAI returned HTTP ${response.status}`
      const error = new Error(detail)
      error.status = response.ok ? 502 : response.status
      throw error
    }

    return data
  } finally {
    clearTimeout(timer)
  }
}

// ------------------------------------------------------------
// Latest NFP endpoint
// ------------------------------------------------------------

app.get('/api/nfp/latest', async (req, res) => {
  try {
    const data = await fetchLatestNfp()
    res.json({ success: true, ...data })
  } catch (error) {
    const status = error.name === 'AbortError' ? 504 : error.status || 502
    console.error('USDNewsAI NFP request failed:', error)
    res.status(status).json({
      success: false,
      error: status === 504 ? 'USDNewsAI NFP request timed out.' : 'Could not reach USDNewsAI NFP predictor.',
    })
  }
})

// ------------------------------------------------------------
// Backward-compatible endpoint
// ------------------------------------------------------------
//
// Keep /api/nfp working so any older NexaFunds code or other
// clients using the previous endpoint do not break.

app.get('/api/nfp', async (req, res) => {
  try {
    const data = await fetchLatestNfp()
    res.json({ success: true, ...data })
  } catch (error) {
    const status = error.name === 'AbortError' ? 504 : error.status || 502
    console.error('USDNewsAI NFP request failed:', error)
    res.status(status).json({
      success: false,
      error: status === 504 ? 'USDNewsAI NFP request timed out.' : 'Could not reach USDNewsAI NFP predictor.',
    })
  }
})

const ECONOMIC_DATA = {
  cpi: {
    prediction: 2.8,
    consensus: 2.7,
    expected_surprise: 0.1,
    direction: 'Bearish',
    forecast_release_date: '2026-09-11',
  },
  ppi: {
    prediction: 3.1,
    consensus: 3.0,
    expected_surprise: 0.1,
    direction: 'Bearish',
    forecast_release_date: '2026-09-10',
  },
  fomc: {
    prediction: 4.25,
    consensus: 4.25,
    expected_surprise: 0,
    direction: 'Neutral',
    forecast_release_date: '2026-09-16',
  },
}

app.get('/api/economic/latest', (req, res) => {
  res.json({ success: true, forecasts: ECONOMIC_DATA })
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

app.get(
  '/api/mt5/status',
  asyncRoute(async (req, res) => {
    const status = await get(mt5db, 'SELECT * FROM mt5_ea_status WHERE id = 1')
    if (!status) {
      return res.json({ success: true, status: 'OFFLINE', live: false, ea: null })
    }

    const stale = isStaleHeartbeat(status.last_seen)
    if (stale && status.status === 'LIVE') {
      await run(mt5db, "UPDATE mt5_ea_status SET status = 'OFFLINE', updated_at = datetime('now') WHERE id = 1")
      await recordJournalEvent({
        eventKey: `ea-disconnected:${status.last_seen}`,
        eventType: 'EA_DISCONNECTED',
        eaName: status.name,
        eaVersion: status.version,
        details: { reason: 'heartbeat_stale', last_seen: status.last_seen },
      })
      status.status = 'OFFLINE'
    }

    res.json({
      success: true,
      status: status.status,
      live: status.status === 'LIVE' && !stale,
      ea: {
        name: status.name || null,
        version: status.version || null,
        last_seen: status.last_seen,
      },
    })
  })
)

app.get(
  '/api/mt5/journal',
  asyncRoute(async (req, res) => {
    const requestedLimit = Number(req.query.limit)
    const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 20
    const events = await all(
      mt5db,
      `SELECT id, event_type, symbol, side, volume, ticket, entry_price, exit_price,
              profit, ea_name, ea_version, details, created_at
       FROM mt5_journal ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`,
      [limit]
    )
    res.json({ success: true, events })
  })
)

app.get(
  '/api/mt5/performance',
  asyncRoute(async (req, res) => {
    const range = String(req.query.range || '3M').toUpperCase()
    const days = range === '1Y' ? 365 : range === '6M' ? 183 : 92
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const points = await all(
      mt5db,
      `SELECT balance, equity, profit, captured_at
       FROM mt5_performance
       WHERE datetime(captured_at) >= datetime(?)
       ORDER BY datetime(captured_at) ASC`,
      [since]
    )
    res.json({ success: true, range, points })
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
    const eaTelemetry = readEaTelemetry(req.body)
    const previousPositions = await all(mt5db, 'SELECT * FROM mt5_positions')
    const previousEa = await get(mt5db, 'SELECT * FROM mt5_ea_status WHERE id = 1')
    const latestPerformance = await get(
      mt5db,
      'SELECT captured_at FROM mt5_performance ORDER BY datetime(captured_at) DESC LIMIT 1'
    )

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

      if (eaTelemetry.provided) {
        const eaChanged = !previousEa || previousEa.name !== eaTelemetry.name || previousEa.version !== eaTelemetry.version
        const statusChanged = !previousEa || previousEa.status !== eaTelemetry.status
        await run(
          mt5db,
          `INSERT INTO mt5_ea_status (id, name, version, status, last_seen, updated_at)
           VALUES (1, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             version = excluded.version,
             status = excluded.status,
             last_seen = excluded.last_seen,
             updated_at = excluded.updated_at`,
          [eaTelemetry.name || previousEa?.name || '', eaTelemetry.version || previousEa?.version || '', eaTelemetry.status, eaTelemetry.lastSeen]
        )

        if (eaTelemetry.status === 'LIVE' && (eaChanged || statusChanged)) {
          await recordJournalEvent({
            eventKey: `ea-connected:${eaTelemetry.name}:${eaTelemetry.version}:${eaTelemetry.lastSeen}`,
            eventType: previousEa?.status === 'OFFLINE' ? 'EA_CONNECTED' : 'EA_STATUS_CHANGED',
            eaName: eaTelemetry.name,
            eaVersion: eaTelemetry.version,
            details: { status: eaTelemetry.status },
          })
        } else if (eaTelemetry.status !== 'LIVE' && statusChanged) {
          await recordJournalEvent({
            eventKey: `ea-status:${eaTelemetry.status}:${eaTelemetry.lastSeen}`,
            eventType: 'EA_STATUS_CHANGED',
            eaName: eaTelemetry.name,
            eaVersion: eaTelemetry.version,
            details: { status: eaTelemetry.status },
          })
        }
      }

      const previousByTicket = new Map(previousPositions.map((position) => [String(position.ticket), position]))
      const currentByTicket = new Map(safePositions.map((position) => [String(position.ticket), position]))
      for (const position of safePositions) {
        const ticket = String(position.ticket ?? '')
        const previous = previousByTicket.get(ticket)
        if (!previous) {
          await recordJournalEvent({
            eventKey: `position-opened:${ticket}:${Number(position.price_open ?? 0)}`,
            eventType: 'POSITION_OPENED',
            symbol: position.symbol,
            side: position.type,
            volume: position.volume,
            ticket,
            entryPrice: position.price_open,
            profit: position.profit,
            eaName: eaTelemetry.name || previousEa?.name,
            eaVersion: eaTelemetry.version || previousEa?.version,
          })
        } else if (
          String(previous.type) !== String(position.type) ||
          Number(previous.volume) !== Number(position.volume) ||
          Number(previous.price_open) !== Number(position.price_open)
        ) {
          await recordJournalEvent({
            eventKey: `position-changed:${ticket}:${position.volume}:${position.price_open}:${position.type}`,
            eventType: 'POSITION_CHANGED',
            symbol: position.symbol,
            side: position.type,
            volume: position.volume,
            ticket,
            entryPrice: position.price_open,
            profit: position.profit,
            eaName: eaTelemetry.name || previousEa?.name,
            eaVersion: eaTelemetry.version || previousEa?.version,
          })
        }
      }

      for (const previous of previousPositions) {
        const ticket = String(previous.ticket)
        if (!currentByTicket.has(ticket)) {
          await recordJournalEvent({
            eventKey: `position-closed:${ticket}:${previous.updated_at}`,
            eventType: 'POSITION_CLOSED',
            symbol: previous.symbol,
            side: previous.type,
            volume: previous.volume,
            ticket,
            entryPrice: previous.price_open,
            exitPrice: previous.current_price,
            profit: previous.profit,
            eaName: eaTelemetry.name || previousEa?.name,
            eaVersion: eaTelemetry.version || previousEa?.version,
          })
        }
      }

      const lastSnapshotTime = latestPerformance ? new Date(String(latestPerformance.captured_at).replace(' ', 'T') + 'Z').getTime() : 0
      if (!lastSnapshotTime || Date.now() - lastSnapshotTime >= PERFORMANCE_SNAPSHOT_INTERVAL_MS) {
        await run(
          mt5db,
          `INSERT INTO mt5_performance (balance, equity, profit, captured_at)
           VALUES (?, ?, ?, datetime('now'))`,
          [Number(account.balance ?? 0), Number(account.equity ?? 0), Number(account.profit ?? 0)]
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
app.use('/api/strategy', strategyRouter)
app.use(express.static(DIST_DIR))
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next()
  }

  res.sendFile(path.join(DIST_DIR, 'index.html'))
})
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
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`NexaFunds backend running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialise databases:', error)
    process.exit(1)
  })
