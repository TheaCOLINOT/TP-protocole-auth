const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function getClientConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
            "Variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_REDIRECT_URI requises (.env)"
        );
    }

    return { clientId, clientSecret, redirectUri };
}

/**
 * Assemble l'URL /authorize Google (client_id, scopes OIDC, PKCE, state).
 */
function buildAuthorizationUrl({ state, codeChallenge }) {
    const { clientId, redirectUri } = getClientConfig();
    const url = new URL(GOOGLE_AUTH_URL);

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "consent");

    return url.toString();
}

/**
 * Échange serveur-à-serveur : code + code_verifier (+ client_secret) → jetons.
 */
async function exchangeCodeForTokens({ code, codeVerifier }) {
    const { clientId, clientSecret, redirectUri } = getClientConfig();

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
    });

    const data = await response.json();

    if (!response.ok) {
        const detail = data.error_description || data.error || "échange de jetons échoué";
        throw new Error(detail);
    }

    return data;
}

/**
 * Décode le payload du JWT d'identité (partie centrale Base64URL → JSON).
 * Note pédagogique : en production, vérifier aussi la signature via JWKS Google.
 */
function decodeIdToken(idToken) {
    if (!idToken || typeof idToken !== "string") {
        throw new Error("id_token manquant");
    }

    const parts = idToken.split(".");
    if (parts.length < 2) {
        throw new Error("id_token JWT invalide");
    }

    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload);
}

module.exports = {
    buildAuthorizationUrl,
    exchangeCodeForTokens,
    decodeIdToken
};
