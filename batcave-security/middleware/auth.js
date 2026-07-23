function requireAuth(req, res, next) {
    if (!req.session?.user) {
        if (req.accepts("html")) {
            return res.redirect("/login.html");
        }
        return res.status(401).json({ error: "Non authentifié" });
    }
    next();
}

module.exports = { requireAuth };
