const express = require('express')
const path = require('path')
const bcrypt = require('bcrypt')
const db = require('../config/db')
const { logAudit, getClientIp } = require('../config/audit')

const router = express.Router()

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/bat-computer')
  }
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'))
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username)

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send('Identifiants invalides')
  }

  req.session.regenerate(err => {
    if (err) return res.status(500).send('Erreur serveur')

    req.session.user = {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin === 1 || user.role === 'ADMIN'
    }
    req.session.ipAddress = getClientIp(req)
    req.session.userAgent = req.headers['user-agent']

    req.session.save(err => {
      if (err) return res.status(500).send('Erreur serveur')

      logAudit(user.username, 'LOGIN', req)
      res.redirect('/bat-computer')
    })
  })
})

router.get('/logout', (req, res) => {
  const username = req.session.user?.username

  if (username) {
    logAudit(username, 'LOGOUT', req)
  }

  req.session.destroy(() => {
    res.clearCookie('bat_identity')
    res.redirect('/auth/login')
  })
})

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'register.html'))
})

router.post('/register', async (req, res) => {
  const { username, password } = req.body
  const hash = await bcrypt.hash(password, 10)

  try {
    const insert = db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    )
    insert.run(username, hash)
    res.status(201).send('Utilisateur créé avec succès !')
  } catch (err) {
    res.status(409).send("Erreur : l'utilisateur existe déjà.")
  }
})

module.exports = router
