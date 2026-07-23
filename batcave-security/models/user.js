const { db } = require("../config/db");

function saveOAuthSession(state, codeVerifier) {
    db.prepare(
        "INSERT INTO oauth_sessions (state, code_verifier) VALUES (?, ?)"
    ).run(state, codeVerifier);
}

/**
 * Récupère le code_verifier lié au state, puis consomme la session (usage unique / anti-rejeu).
 */
function consumeOAuthSession(state) {
    const row = db
        .prepare("SELECT code_verifier FROM oauth_sessions WHERE state = ?")
        .get(state);

    if (!row) {
        return null;
    }

    deleteOAuthSession(state);
    return row.code_verifier;
}

function deleteOAuthSession(state) {
    db.prepare("DELETE FROM oauth_sessions WHERE state = ?").run(state);
}

/**
 * Crée ou met à jour le profil à partir du jeton d'identité Google (claim sub).
 */
function upsertUser({ googleId, email, name, picture }) {
    db.prepare(`
        INSERT INTO users (google_id, email, name, picture)
        VALUES (@googleId, @email, @name, @picture)
        ON CONFLICT(google_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            picture = excluded.picture,
            updated_at = strftime('%s', 'now')
    `).run({
        googleId,
        email: email || null,
        name: name || null,
        picture: picture || null
    });

    return db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId);
}

function findUserById(id) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

module.exports = {
    saveOAuthSession,
    consumeOAuthSession,
    deleteOAuthSession,
    upsertUser,
    findUserById
};
