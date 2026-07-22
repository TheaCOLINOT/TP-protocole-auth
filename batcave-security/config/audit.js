const db = require('./db')

function getClientIp (req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress
  )
}

function logAudit (username, action, req) {
  const ip = getClientIp(req)
  const ua = req.headers['user-agent'] || ''

  db.prepare(
    'INSERT INTO connexions_audit (username, action, ip_address, user_agent) VALUES (?, ?, ?, ?)'
  ).run(username, action, ip, ua)
}

module.exports = { logAudit, getClientIp }
