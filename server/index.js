import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcrypt'

const app = express()
const db = new sqlite3.Database('./database.db')

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
          return res.status(400).json({
            success: false,
            error: 'Email already exists',
          })
        }

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
