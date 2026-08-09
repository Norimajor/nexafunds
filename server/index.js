import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { Resend } from 'resend'

dotenv.config()

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const app = express()
const db = new sqlite3.Database('./database.db')
const pendingVerifications = new Map()
app.use(cors())
app.use(express.json())

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    country TEXT,
    city TEXT,
    address TEXT,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS account_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`)

const seedAccountDefaults = () => {
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

  defaultEntries.forEach(([key, value]) => {
    db.get('SELECT 1 FROM account_settings WHERE key = ?', [key], (err, row) => {
      if (!err && !row) {
        db.run('INSERT INTO account_settings (key, value) VALUES (?, ?)', [key, value])
      }
    })
  })
}

seedAccountDefaults()

// ================= TEST ROUTE =================
app.get('/', (req, res) => {
  res.send('NexaFunds backend is running')
})
// ================= SEND VERIFICATION CODE =================
app.post('/api/send-code', async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
    })
  }

  const code = Math.floor(
    100000 + Math.random() * 900000
  ).toString()

  pendingVerifications.set(email, {
    code,
    verified: false,
    expires: Date.now() + 10 * 60 * 1000,
  })

  try {
    if (!resend) {
      return res.json({
        success: true,
        message: 'Verification code generated in local mode',
        code,
      })
    }

    await resend.emails.send({
      from: 'NexaFunds <onboarding@resend.dev>',
      to: email,
      subject: 'Your NexaFunds verification code',
      html: `
        <h2>NexaFunds Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size:36px;color:#2563eb;">${code}</h1>
        <p>This code expires in 10 minutes.</p>
      `,
    })

    res.json({
      success: true,
      message: 'Verification code sent',
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to send email',
    })
  }
})

// ================= VERIFY CODE =================
app.post('/api/verify-code', (req, res) => {
  const { email, code } = req.body

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      error: 'Email and verification code are required',
    })
  }

  const verification = pendingVerifications.get(email)

  if (!verification) {
    return res.status(400).json({
      success: false,
      error: 'No verification request found for this email',
    })
  }

  if (Date.now() > verification.expires) {
    pendingVerifications.delete(email)
    return res.status(400).json({
      success: false,
      error: 'Verification code has expired',
    })
  }

  if (verification.code !== code.toString()) {
    return res.status(400).json({
      success: false,
      error: 'Invalid verification code',
    })
  }

  verification.verified = true
  pendingVerifications.set(email, verification)

  res.json({
    success: true,
    message: 'Email verified successfully',
  })
})

// ================= REGISTER =================
app.post('/api/register', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    country,
    city,
    address,
    password,
  } = req.body

  const verification = pendingVerifications.get(email)

  if (!verification || !verification.verified) {
    return res.status(400).json({
      success: false,
      error: 'Please verify your email before creating an account',
    })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    db.run(
      `INSERT INTO users
      (first_name, last_name, email, country, city, address, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name,
        email,
        country,
        city,
        address,
        hashedPassword,
      ],
      function (err) {
        if (err) {
          pendingVerifications.delete(email)
          return res.status(400).json({
            success: false,
            error: 'Email already exists',
          })
        }

        pendingVerifications.delete(email)
        res.json({
          success: true,
          message: 'Account created successfully',
          userId: this.lastID,
        })
      }
    )
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
    })
  }
})

// ================= LOGIN =================
app.post('/api/login', (req, res) => {
  const { email, password } = req.body

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        })
      }

      const validPassword = await bcrypt.compare(
        password,
        user.password
      )

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        })
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
      })
    }
  )
})

// ================= ACCOUNT SUMMARY =================
app.get('/api/account/summary', (req, res) => {
  db.all(
    'SELECT type, amount, created_at FROM transactions ORDER BY created_at DESC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message,
        })
      }

      const currentBalance = rows.reduce((total, row) => {
        return row.type === 'deposit' ? total + Number(row.amount) : total - Number(row.amount)
      }, 0)

      const totalProfit = currentBalance > 0 ? currentBalance - 6000 : 0
      const portfolioValue = currentBalance + 4200
      const totalInvested = 6000

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
    }
  )
})

// ================= TRANSACTIONS =================
app.get('/api/transactions', (req, res) => {
  db.all(
    'SELECT id, type, amount, note, created_at FROM transactions ORDER BY created_at DESC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message,
        })
      }

      res.json({
        success: true,
        transactions: rows,
      })
    }
  )
})

app.post('/api/transactions', (req, res) => {
  const { type, amount, note } = req.body

  if (!type || !['deposit', 'withdrawal'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Transaction type must be deposit or withdrawal',
    })
  }

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'A valid amount is required',
    })
  }

  db.run(
    'INSERT INTO transactions (type, amount, note) VALUES (?, ?, ?)',
    [type, Number(amount), note || ''],
    function (insertErr) {
      if (insertErr) {
        return res.status(500).json({
          success: false,
          error: insertErr.message,
        })
      }

      const transaction = {
        id: this.lastID,
        type,
        amount: Number(amount),
        note: note || '',
        created_at: new Date().toISOString(),
      }

      res.status(201).json({
        success: true,
        message: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} logged successfully`,
        transaction,
      })
    }
  )
})

// ================= EA SETTINGS =================
app.get('/api/ea/settings', (req, res) => {
  db.all(
    "SELECT key, value FROM account_settings WHERE key LIKE 'ea_%' OR key IN ('auto_trade', 'push_notifications', 'max_order_size', 'pamm_access', 'broker_access') ORDER BY key",
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message,
        })
      }

      const settings = rows.reduce((acc, row) => {
        acc[row.key] = row.value
        return acc
      }, {})

      res.json({
        success: true,
        settings: {
          ea_name: settings.ea_name || 'Nexa Gold Scalper',
          ea_risk: settings.ea_risk || 'Moderate',
          ea_drawdown: settings.ea_drawdown || '12',
          ea_status: settings.ea_status || 'Live',
          auto_trade: settings.auto_trade === 'true',
          push_notifications: settings.push_notifications === 'true',
          max_order_size: settings.max_order_size || '1.5',
          pamm_access: settings.pamm_access === 'true',
          broker_access: settings.broker_access === 'true',
        },
      })
    }
  )
})

app.put('/api/ea/settings', (req, res) => {
  const { ea_name, ea_risk, ea_drawdown, ea_status, auto_trade, push_notifications, max_order_size, pamm_access, broker_access } = req.body || {}

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

  const next = () => {
    const entry = updates.shift()
    if (!entry) {
      return res.json({
        success: true,
        message: 'EA settings updated successfully',
      })
    }

    const [key, value] = entry
    db.get('SELECT 1 FROM account_settings WHERE key = ?', [key], (selectErr, row) => {
      if (selectErr) {
        return res.status(500).json({ success: false, error: selectErr.message })
      }

      if (row) {
        db.run('UPDATE account_settings SET value = ? WHERE key = ?', [value, key], (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ success: false, error: updateErr.message })
          }
          next()
        })
      } else {
        db.run('INSERT INTO account_settings (key, value) VALUES (?, ?)', [key, value], (insertErr) => {
          if (insertErr) {
            return res.status(500).json({ success: false, error: insertErr.message })
          }
          next()
        })
      }
    })
  }

  next()
})

// ================= GET ALL USERS =================
app.get('/api/users', (req, res) => {
  db.all(
    `SELECT
      id,
      first_name,
      last_name,
      email,
      country,
      city,
      created_at
     FROM users
     ORDER BY id DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message,
        })
      }

      res.json(rows)
    }
  )
})

// ================= USER COUNT =================
app.get('/api/stats/users', (req, res) => {
  db.get(
    'SELECT COUNT(*) as total FROM users',
    (err, row) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message,
        })
      }

      res.json({
        success: true,
        totalUsers: row.total,
      })
    }
  )
})

// ================= START SERVER =================
const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`NexaFunds backend running on port ${PORT}`)
})
