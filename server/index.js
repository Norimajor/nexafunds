import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

// Create database
const db = new sqlite3.Database('./database.db')

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      balance REAL DEFAULT 0
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      amount REAL,
      method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Demo user
  db.run(`
    INSERT OR IGNORE INTO users (id, email, balance)
    VALUES (1, 'demo@nexafunds.com', 7420.50)
  `)
})

// Dashboard balance
app.get('/api/dashboard', (req, res) => {
  db.get('SELECT balance FROM users WHERE id = 1', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }

    res.json({ balance: row.balance })
  })
})

// All transactions
app.get('/api/transactions', (req, res) => {
  db.all(
    'SELECT * FROM transactions ORDER BY created_at DESC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message })
      }

      res.json(rows)
    }
  )
})

// Deposit
app.post('/api/deposit', (req, res) => {
  const { amount, method } = req.body

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  db.run(
    'INSERT INTO transactions (type, amount, method) VALUES (?, ?, ?)',
    ['deposit', amount, method || 'Bank Transfer'],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message })
      }

      db.run(
        'UPDATE users SET balance = balance + ? WHERE id = 1',
        [amount],
        () => {
          res.json({
            success: true,
            message: 'Deposit successful',
            amount
          })
        }
      )
    }
  )
})

// Withdraw
app.post('/api/withdraw', (req, res) => {
  const { amount, method } = req.body

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  db.get('SELECT balance FROM users WHERE id = 1', (err, user) => {
    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    db.run(
      'INSERT INTO transactions (type, amount, method) VALUES (?, ?, ?)',
      ['withdrawal', amount, method || 'Bank Transfer'],
      function () {
        db.run(
          'UPDATE users SET balance = balance - ? WHERE id = 1',
          [amount],
          () => {
            res.json({
              success: true,
              message: 'Withdrawal successful',
              amount
            })
          }
        )
      }
    )
  })
})

app.listen(PORT, () => {
  console.log(`🚀 NexaFunds API running at http://localhost:${PORT}`)
})