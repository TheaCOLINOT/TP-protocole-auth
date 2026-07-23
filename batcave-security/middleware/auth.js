const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;

function checkJWT(req, res, next) {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.slice(7);
    }

    if (!token) {
        return res.status(401).json({ error: "Token manquant" });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Token invalide ou expiré" });
    }
}

function require2FA(req, res, next) {
    if (!req.user.is2FAVerified) {
        return res.status(403).json({ error: "Authentification à deux facteurs requise" });
    }
    next();
}

module.exports = { checkJWT, require2FA };
