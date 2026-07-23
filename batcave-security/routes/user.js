const express = require("express");
const { checkJWT, checkScope } = require("../middleware/auth");
const { db } = require("../config/db");

const router = express.Router();

router.get("/me", checkJWT, checkScope("computers:read"), (req, res) => {
    const user = db
        .prepare("SELECT id, username, two_factor_enabled FROM users WHERE id = ?")
        .get(req.user.userId);

    if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    res.json({
        id: user.id,
        username: user.username,
        two_factor_enabled: Boolean(user.two_factor_enabled),
        scopes: req.user.scopes || []
    });
});

router.get(
    "/secret-batmobile",
    checkJWT,
    checkScope("batmobile:control"),
    (req, res) => {
        res.json({
            message: "Accès Batmobile autorisé",
            commandes: ["Activer turbo", "Lancer grappling", "Mode furtif"]
        });
    }
);

router.get("/batmobile-status", checkJWT, checkScope("batmobile:status"), (req, res) => {
    res.json({
        message: "Statut Batmobile",
        status: "en standby",
        fuel: "78%",
        location: "Batcave niveau -3"
    });
});

router.get("/armory", checkJWT, checkScope("armory:weapons"), (req, res) => {
    res.json({
        message: "Accès armurerie autorisé",
        arsenal: ["Batarangs", "Grapple gun", "Bat-suit Mark VII"]
    });
});

module.exports = router;
