import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { Resend } from 'resend'

dotenv.config()

const resend = new Resend(process.env.RESEND_API_KEY)

const app = express()
const db = new sqlite3.Database('./database.db')
const pendingVerifications = new Map()
app.use(cors())
app.use(express.json())

// Create users table
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
