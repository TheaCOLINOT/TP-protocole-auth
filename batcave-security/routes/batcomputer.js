const express = require('express')
const path = require('path')
const fs = require('fs')
const db = require('../config/db')
const {
  isAuthenticated,
  verifyFingerprint,
  isAdmin
} = require('../middlewares/authCheck')

const router = express.Router()

router.get('/bat-computer', isAuthenticated, verifyFingerprint, (req, res) => {
  const template = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'bat-computer.html'),
    'utf8'
  )
  const html = template.replace('{{username}}', req.session.user.username)
  res.send(html)
})

router.get(
  '/admin-page',
  isAuthenticated,
  verifyFingerprint,
  isAdmin,
  (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin-page.html'))
  }
)

router.get(
  '/api/audit-logs',
  isAuthenticated,
  verifyFingerprint,
  isAdmin,
  (req, res) => {
    const logs = db
      .prepare(
        'SELECT username, action, ip_address, user_agent, timestamp FROM connexions_audit ORDER BY timestamp DESC'
      )
      .all()
    res.json(logs)
  }
)

module.exports = router
