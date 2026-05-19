const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;

// Middleware JSON
app.use(express.json());

// Connexion à SQLite
const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.error("Erreur connexion BDD :", err.message);
    } else {
        console.log("Connecté à SQLite.");
    }
});

// Création table users si elle n'existe pas
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`, (err) => {
    if (err) {
        console.error("Erreur création table :", err.message);
    } else {
        console.log("Table users prête.");
    }
});

// Route test
app.get("/", (req, res) => {
    res.send("Serveur Node.js + SQLite OK");
});

// Ajouter un utilisateur
app.post("/users", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: "username et password requis"
        });
    }

    const sql = `
        INSERT INTO users (username, password)
        VALUES (?, ?)
    `;

    db.run(sql, [username, password], function(err) {
        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

        res.json({
            id: this.lastID,
            username
        });
    });
});

// Lister les users
app.get("/users", (req, res) => {
    db.all("SELECT id, username FROM users", [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
});

// Démarrage serveur
app.listen(PORT, () => {
    console.log(`Serveur lancé : http://localhost:${PORT}`);
});