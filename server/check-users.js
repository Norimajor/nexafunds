import sqlite3 from 'sqlite3'

const db = new sqlite3.Database('./database.db')

db.all(
  'SELECT id, first_name, last_name, email, created_at FROM users ORDER BY id DESC',
  (err, rows) => {
    if (err) {
      console.error(err)
    } else {
      console.table(rows)
    }

    db.close()
  }
)