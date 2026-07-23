const express = require("express");
const {
    generateCodeVerifier,
    generateCodeChallenge,
    generateState
} = require("../services/cryptoService");
const {
    buildAuthorizationUrl,
    exchangeCodeForTokens,
    decodeIdToken
} = require("../services/oauthService");
const {
    saveOAuthSession,
    consumeOAuthSession,
    upsertUser
} = require("../models/user");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * 1. Initialisation du flux Authorization Code + PKCE
 * GET /login/google
 */
router.get("/login/google", (req, res) => {
    try {
        const state = generateState();
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);

        saveOAuthSession(state, codeVerifier);

        const authorizationUrl = buildAuthorizationUrl({ state, codeChallenge });
        res.redirect(authorizationUrl);
    } catch (err) {
        console.error("[OAuth login]", err.message);
        res.status(500).send(
            "Configuration OAuth incomplète. Vérifiez GOOGLE_CLIENT_ID / SECRET dans .env"
        );
    }
});

/**
 * 2–4. Callback Google : validation state, échange code→jetons, session locale
 * GET /callback/google?code=...&state=...
 */
router.get("/callback/google", async (req, res) => {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
        return res.status(403).send(`Accès refusé : ${errorDescription || error}`);
    }

    if (!code || !state) {
        return res.status(400).send("Paramètres code et state requis");
    }

    const codeVerifier = consumeOAuthSession(String(state));
    if (!codeVerifier) {
        return res.status(403).send("Access Denied — state invalide ou déjà consommé");
    }

    try {
        const tokens = await exchangeCodeForTokens({
            code: String(code),
            codeVerifier
        });

        const identity = decodeIdToken(tokens.id_token);

        const user = upsertUser({
            googleId: identity.sub,
            email: identity.email,
            name: identity.name,
            picture: identity.picture
        });

        // Session Express locale — le access_token Google n'est pas conservé
        // (il servirait à appeler les API Google ; ici on n'a besoin que de l'identité OIDC)
        req.session.user = {
            id: user.id,
            googleId: user.google_id,
            email: user.email,
            name: user.name,
            picture: user.picture
        };

        res.redirect("/dashboard");
    } catch (err) {
        console.error("[OAuth callback]", err.message);
        res.status(500).send(`Échec de l'authentification Google : ${err.message}`);
    }
});

router.get("/dashboard", requireAuth, (req, res) => {
    res.sendFile("dashboard.html", { root: require("path").join(__dirname, "..", "views") });
});

router.get("/api/me", requireAuth, (req, res) => {
    res.json({ user: req.session.user });
});

router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Impossible de détruire la session" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Déconnexion réussie" });
    });
});

module.exports = router;
