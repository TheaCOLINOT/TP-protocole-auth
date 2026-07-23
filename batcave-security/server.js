require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const { initDb } = require("./config/db");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

// En-têtes de sécurité HTTP (CSP, X-Frame-Options, nosniff, etc.)
app.use(helmet());

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// Alias demandé par le TP : /api/verify-2fa
app.post("/api/verify-2fa", authRoutes.verify2FAHandler);

app.get("/", (req, res) => {
    res.redirect("/login.html");
});

app.listen(PORT, () => {
    console.log(`Batcave Security — http://localhost:${PORT}`);
});
