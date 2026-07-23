const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "database.db"));

const BATMAN_SCOPES = JSON.stringify([
    "computers:admin",
    "computers:read",
    "batmobile:control",
    "batmobile:status",
    "armory:weapons"
]);

const ALLY_SCOPES = JSON.stringify([
    "computers:read",
    "batmobile:status"
]);

function ensureColumn(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((col) => col.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
}

function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            two_factor_secret TEXT,
            two_factor_enabled INTEGER NOT NULL DEFAULT 0,
            scopes TEXT
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

    ensureColumn("users", "two_factor_secret", "TEXT");
    ensureColumn("users", "two_factor_enabled", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn("users", "scopes", "TEXT");
    ensureColumn("refresh_tokens", "status", "TEXT NOT NULL DEFAULT 'active'");

    const batman = db.prepare("SELECT id FROM users WHERE username = ?").get("batman");
    if (!batman) {
        const hash = bcrypt.hashSync("Alfred123!@#Secure", 10);
        db.prepare(
            "INSERT INTO users (username, password, two_factor_enabled, scopes) VALUES (?, ?, 0, ?)"
        ).run("batman", hash, BATMAN_SCOPES);
        console.log("Utilisateur de test créé : batman / Alfred123!@#Secure");
    } else {
        db.prepare("UPDATE users SET scopes = COALESCE(scopes, ?) WHERE username = ?").run(
            BATMAN_SCOPES,
            "batman"
        );
    }

    const nightwing = db.prepare("SELECT id FROM users WHERE username = ?").get("nightwing");
    if (!nightwing) {
        const hash = bcrypt.hashSync("Nightwing123!@#", 10);
        db.prepare(
            "INSERT INTO users (username, password, two_factor_enabled, scopes) VALUES (?, ?, 0, ?)"
        ).run("nightwing", hash, ALLY_SCOPES);
        console.log("Allié créé : nightwing / Nightwing123!@# (scopes restreints)");
    }

    console.log("Base de données initialisée.");
}

function getUserScopes(user) {
    if (!user?.scopes) {
        return ["computers:read"];
    }
    try {
        const parsed = JSON.parse(user.scopes);
        return Array.isArray(parsed) ? parsed : ["computers:read"];
    } catch {
        return ["computers:read"];
    }
}

module.exports = { db, initDb, getUserScopes, BATMAN_SCOPES, ALLY_SCOPES };
