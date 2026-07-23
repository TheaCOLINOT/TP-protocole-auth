const express = require("express");
const { checkJWT, require2FA } = require("../middleware/auth");
const { db } = require("../config/db");

const router = express.Router();

router.get("/me", checkJWT, (req, res) => {
    const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(req.user.userId);

    if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    res.json({
        id: user.id,
        username: user.username,
        is2FAVerified: req.user.is2FAVerified || false
    });
});

router.get("/secret-batmobile", checkJWT, require2FA, (req, res) => {
    res.json({
        message: "Accès Batmobile autorisé",
        commandes: ["Activer turbo", "Lancer grappling", "Mode furtif"]
    });
});

module.exports = router;
