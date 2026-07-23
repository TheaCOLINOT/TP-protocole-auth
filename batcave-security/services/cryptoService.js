const crypto = require("crypto");

/**
 * Génère un Code Verifier PKCE : 32 octets aléatoires encodés en base64url (64 car.).
 */
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString("base64url");
}

/**
 * Code Challenge = Base64URL(SHA-256(Code Verifier))
 */
function generateCodeChallenge(codeVerifier) {
    return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

/**
 * Jeton state anti-CSRF (aléatoire sécurisé).
 */
function generateState() {
    return crypto.randomBytes(32).toString("base64url");
}

module.exports = {
    generateCodeVerifier,
    generateCodeChallenge,
    generateState
};
