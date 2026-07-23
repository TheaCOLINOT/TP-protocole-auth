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
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.purpose === "2fa-setup") {
            return res.status(403).json({ error: "Jeton d'enrôlement insuffisant pour cette ressource" });
        }
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Token invalide ou expiré" });
    }
}

/** Autorise un access token OU un setupToken (premier facteur) pour l'enrôlement 2FA. */
function checkFirstFactor(req, res, next) {
    const accessToken = req.cookies?.token;
    const setupToken = req.cookies?.setupToken;

    const candidates = [accessToken, setupToken].filter(Boolean);

    if (candidates.length === 0 && req.headers.authorization?.startsWith("Bearer ")) {
        candidates.push(req.headers.authorization.slice(7));
    }

    if (candidates.length === 0) {
        return res.status(401).json({ error: "Authentification premier facteur requise" });
    }

    for (const token of candidates) {
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            req.user = payload;
            return next();
        } catch {
            // essaie le jeton suivant
        }
    }

    return res.status(401).json({ error: "Token invalide ou expiré" });
}

/**
 * Middleware de contrôle d'accès par scope OAuth2-like.
 * À placer après checkJWT.
 */
function checkScope(requiredScope) {
    return (req, res, next) => {
        const scopes = req.user?.scopes;

        if (!Array.isArray(scopes) || !scopes.includes(requiredScope)) {
            return res.status(403).json({
                error: `Scope requis manquant : ${requiredScope}`
            });
        }

        next();
    };
}

module.exports = { checkJWT, checkFirstFactor, checkScope };
