const { logAudit, getClientIp } = require('../config/audit')

function isAuthenticated (req, res, next) {
  if (!req.session.user) {
    return res.status(401).redirect('/auth/login')
  }
  next()
}

function verifyFingerprint (req, res, next) {
  if (!req.session.user) return next()

  const currentIp = getClientIp(req)
  const currentUa = req.headers['user-agent']

  if (
    currentIp !== req.session.ipAddress ||
    currentUa !== req.session.userAgent
  ) {
    const username = req.session.user.username
    logAudit(username, 'FRAUD', req)
    console.log(
      `⚠️ ALERTE FRAUDE : accès suspect détecté pour l'agent ${username}`
    )

    return req.session.destroy(() => {
      res.clearCookie('bat_identity')
      return res
        .status(403)
        .send('Session compromise — accès bloqué. Reconnectez-vous.')
    })
  }

  next()
}

function isAdmin (req, res, next) {
  if (!req.session.user?.is_admin) {
    return res.status(403).send('Accès réservé aux administrateurs.')
  }
  next()
}

module.exports = { isAuthenticated, verifyFingerprint, isAdmin }
