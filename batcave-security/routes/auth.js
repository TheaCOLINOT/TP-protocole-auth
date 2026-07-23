const express = require("express");
const bcrypt = require("bcrypt");
const { db } = require("../config/db");
const { checkJWT } = require("../middleware/auth");
const {
    generateRefreshToken,
    signAccessToken,
    setTokenCookies,
    clearTokenCookies,
    REFRESH_TOKEN_MAX_AGE
} = require("../utils/tokens");
const { validatePasswordStrength } = require("../utils/password");

const router = express.Router();

const ALFRED_2FA_CODE = "BATCAVE42";

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Identifiants requis" });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Identifiants invalides" });
    }

    const accessToken = signAccessToken(user, false);
    const refreshToken = generateRefreshToken();
    const expiresAt = Date.now() + REFRESH_TOKEN_MAX_AGE;

    db.prepare(
        "INSERT INTO refresh_tokens (user_id, token, expires_at, status) VALUES (?, ?, ?, 'active')"
    ).run(user.id, refreshToken, expiresAt);

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
        message: "Connexion réussie",
        user: { id: user.id, username: user.username }
    });
});

router.post("/refresh", (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token manquant" });
    }

    const row = db.prepare("SELECT * FROM refresh_tokens WHERE token = ?").get(refreshToken);

    if (!row) {
        clearTokenCookies(res);
        return res.status(401).json({ error: "Refresh token invalide" });
    }

    if (row.status === "used") {
        db.prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(row.user_id);
        clearTokenCookies(res);
        console.warn("[AUTH] Réutilisation de refresh token détectée — toutes les sessions révoquées");
        return res.status(401).json({ error: "Réutilisation de token détectée" });
    }

    if (Date.now() > row.expires_at) {
        db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(row.id);
        clearTokenCookies(res);
        return res.status(401).json({ error: "Refresh token expiré" });
    }

    db.prepare("UPDATE refresh_tokens SET status = 'used' WHERE id = ?").run(row.id);

    const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(row.user_id);
    const newRefreshToken = generateRefreshToken();
    const expiresAt = Date.now() + REFRESH_TOKEN_MAX_AGE;

    db.prepare(
        "INSERT INTO refresh_tokens (user_id, token, expires_at, status) VALUES (?, ?, ?, 'active')"
    ).run(user.id, newRefreshToken, expiresAt);

    const accessToken = signAccessToken(user, false);
    setTokenCookies(res, accessToken, newRefreshToken);

    console.log("[AUTH] Token rafraîchi avec succès (rotation activée)");
    res.json({ message: "Token rafraîchi" });
});

router.post("/logout", (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(refreshToken);
    }

    clearTokenCookies(res);
    res.json({ message: "Déconnexion réussie" });
});

router.post("/verify-2fa", checkJWT, (req, res) => {
    const { code } = req.body;

    if (!code || code !== ALFRED_2FA_CODE) {
        return res.status(401).json({ error: "Code 2FA invalide" });
    }

    const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(req.user.userId);
    const accessToken = signAccessToken(user, true);
    setTokenCookies(res, accessToken);

    res.json({ message: "2FA validée", is2FAVerified: true });
});

router.post("/change-password", checkJWT, (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.userId);

    if (!bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(401).json({ error: "Ancien mot de passe incorrect" });
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);

    res.json({ message: "Mot de passe modifié avec succès" });
});

module.exports = router;
