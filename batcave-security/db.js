const Database = require('better-sqlite3')
const db = new Database('database.db')

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER'
  )
`).run()

db.prepare(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`).run()

db.prepare(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run()

const userColumns = db.prepare('PRAGMA table_info(users)').all()
if (!userColumns.some(col => col.name === 'role')) {
  db.prepare("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'USER'").run()
  db.prepare("UPDATE users SET role = 'ADMIN' WHERE id = (SELECT MIN(id) FROM users)").run()
}

module.exports = db
