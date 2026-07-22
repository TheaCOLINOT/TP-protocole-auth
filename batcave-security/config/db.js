const Database = require('better-sqlite3')
const bcrypt = require('bcrypt')
const path = require('path')

const db = new Database(path.join(__dirname, '..', 'database.db'))

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    is_admin INTEGER DEFAULT 0
  )
`
).run()

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS connexions_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`
).run()

const adminExists = db
  .prepare("SELECT id FROM users WHERE role = 'ADMIN' OR is_admin = 1")
  .get()

if (!adminExists) {
  const hash = bcrypt.hashSync('batcave', 10)
  db.prepare(
    "INSERT INTO users (username, password, role, is_admin) VALUES (?, ?, 'ADMIN', 1)"
  ).run('alfred', hash)
}

module.exports = db
