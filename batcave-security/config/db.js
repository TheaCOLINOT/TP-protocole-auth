const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "database.db"));

function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    const batman = db.prepare("SELECT id FROM users WHERE username = ?").get("batman");
    if (!batman) {
        const hash = bcrypt.hashSync("Alfred123!@#Secure", 10);
        db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("batman", hash);
        console.log("Utilisateur de test créé : batman / Alfred123!@#Secure");
    }

    console.log("Base de données initialisée.");
}

module.exports = { db, initDb };
