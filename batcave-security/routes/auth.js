const express = require("express");
const bcrypt = require("bcrypt");
const QRCode = require("qrcode");
const { authenticator } = require("@otplib/preset-v11");
const { db } = require("../config/db");
const { checkJWT, checkFirstFactor } = require("../middleware/auth");
const {
    generateRefreshToken,
    signAccessToken,
    signSetupToken,
    setTokenCookies,
    setSetupTokenCookie,
    clearTokenCookies,
    REFRESH_TOKEN_MAX_AGE
} = require("../utils/tokens");
const { validatePasswordStrength } = require("../utils/password");

const router = express.Router();

function issueSessionCookies(res, user) {
    const accessToken = signAccessToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt = Date.now() + REFRESH_TOKEN_MAX_AGE;

    db.prepare(
        "INSERT INTO refresh_tokens (user_id, token, expires_at, status) VALUES (?, ?, ?, 'active')"
    ).run(user.id, refreshToken, expiresAt);

    setTokenCookies(res, accessToken, refreshToken);
    res.clearCookie("setupToken", { path: "/" });
}

/**
 * LOGIN — Zéro-confiance
 * 1) Valide username/password
 * 2) Si 2FA absente → 403 + setupToken (pas d'access/refresh)
 * 3) Si 2FA active → requires2FA: true (pas encore de JWT)
 */
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Identifiants requis" });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Identifiants invalides" });
    }

    if (!user.two_factor_enabled) {
        const setupToken = signSetupToken(user);
        setSetupTokenCookie(res, setupToken);

        return res.status(403).json({
            error: "Activation de la 2FA obligatoire avant toute connexion à la Batcave.",
            requires2FASetup: true,
            username: user.username
        });
    }

    return res.json({
        requires2FA: true,
        message: "Code TOTP requis pour finaliser l'authentification",
        username: user.username
    });
});

/**
 * ÉTAPE 4 — Initialisation 2FA (premier facteur requis)
 */
router.post("/2fa/setup", checkFirstFactor, async (req, res) => {
    try {
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        if (user.two_factor_enabled) {
            return res.status(400).json({ error: "La 2FA est déjà activée sur ce compte" });
        }

        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(user.username, "Batcave", secret);

        db.prepare(
            "UPDATE users SET two_factor_secret = ?, two_factor_enabled = 0 WHERE id = ?"
        ).run(secret, user.id);

        const qrCode = await QRCode.toDataURL(otpauthUrl);

        res.json({
            message: "Scannez le QR code avec Google Authenticator (ou équivalent)",
            qrCode,
            secret,
            otpauthUrl
        });
    } catch (err) {
        console.error("[2FA setup]", err);
        res.status(500).json({ error: "Impossible de générer le secret 2FA" });
    }
});

/**
 * ÉTAPE 5 — Confirmation 2FA (premier code TOTP)
 */
router.post("/2fa/confirm", checkFirstFactor, (req, res) => {
    const { code, username } = req.body;
    const targetUsername = username || req.user.username;

    if (!code) {
        return res.status(400).json({ error: "Code TOTP à 6 chiffres requis" });
    }

    const user = db
        .prepare("SELECT * FROM users WHERE username = ? AND id = ?")
        .get(targetUsername, req.user.userId);

    if (!user || !user.two_factor_secret) {
        return res.status(400).json({ error: "Aucun secret 2FA en attente — lancez d'abord /2fa/setup" });
    }

    const isValid = authenticator.check(String(code).trim(), user.two_factor_secret);

    if (!isValid) {
        return res.status(401).json({ error: "Code 2FA invalide ou expiré" });
    }

    db.prepare("UPDATE users SET two_factor_enabled = 1 WHERE id = ?").run(user.id);

    res.json({
        message: "2FA activée avec succès. Reconnectez-vous pour obtenir vos jetons.",
        two_factor_enabled: true
    });
});

/**
 * ÉTAPE 7 — Validation finale du login (TOTP)
 * Accessible via POST /api/auth/verify-2fa et POST /api/verify-2fa
 */
function verify2FAHandler(req, res) {
    const { username, code } = req.body;

    if (!username || !code) {
        return res.status(400).json({ error: "username et code TOTP requis" });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
        return res.status(401).json({ error: "2FA non configurée pour cet utilisateur" });
    }

    const isValid = authenticator.check(String(code).trim(), user.two_factor_secret);

    if (!isValid) {
        return res.status(401).json({ error: "Code 2FA invalide ou expiré" });
    }

    issueSessionCookies(res, user);

    res.json({
        message: "Authentification complète — bienvenue dans la Batcave",
        user: { id: user.id, username: user.username }
    });
}

router.post("/verify-2fa", verify2FAHandler);

/**
 * Challenge 1 — Rotation + détection de rejeu (token volé)
 */
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

    // Rejeu d'un jeton déjà consommé → vol probable : révocation totale
    if (row.status === "used") {
        db.prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(row.user_id);
        clearTokenCookies(res);
        console.warn(
            `[AUTH] Replay refresh token détecté (user_id=${row.user_id}) — toutes les sessions révoquées`
        );
        return res.status(401).json({
            error: "Réutilisation de token détectée — toutes les sessions ont été révoquées. Réauthentification MFA requise."
        });
    }

    if (Date.now() > row.expires_at) {
        db.prepare("DELETE FROM refresh_tokens WHERE id = ?").run(row.id);
        clearTokenCookies(res);
        return res.status(401).json({ error: "Refresh token expiré" });
    }

    db.prepare("UPDATE refresh_tokens SET status = 'used' WHERE id = ?").run(row.id);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(row.user_id);
    if (!user) {
        clearTokenCookies(res);
        return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    const newRefreshToken = generateRefreshToken();
    const expiresAt = Date.now() + REFRESH_TOKEN_MAX_AGE;

    db.prepare(
        "INSERT INTO refresh_tokens (user_id, token, expires_at, status) VALUES (?, ?, ?, 'active')"
    ).run(user.id, newRefreshToken, expiresAt);

    const accessToken = signAccessToken(user);
    setTokenCookies(res, accessToken, newRefreshToken);

    console.log("[AUTH] Token rafraîchi (rotation + historique is_used)");
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
module.exports.verify2FAHandler = verify2FAHandler;
