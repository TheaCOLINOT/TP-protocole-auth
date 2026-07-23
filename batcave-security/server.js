require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const path = require("path");
const { initDb } = require("./config/db");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"]
            }
        }
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-insecure-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

app.use(express.static(path.join(__dirname, "public")));
app.use(authRoutes);

app.get("/", (req, res) => {
    if (req.session?.user) {
        return res.redirect("/dashboard");
    }
    res.redirect("/login.html");
});

app.listen(PORT, () => {
    console.log(`Batcave Security (OAuth 2.0 / OIDC) — http://localhost:${PORT}`);
});
