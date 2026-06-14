const express = require('express')
const bcrypt = require('bcrypt')
const path = require('path')
const db = require('./db')

const app = express()
app.use(express.json())
app.use(express.static('public'))

const PORT = 3000
const BLOCK_DURATION_MS = 30_000
const MAX_FAILED_ATTEMPTS = 3

const failedAttempts = new Map()

const GADGETS = [
  { name: 'Batarang', desc: 'Arme de jet', icon: 'fa-shuriken' },
  { name: 'Grapple Gun', desc: 'Grappin pour escalade urbaine', icon: 'fa-anchor' },
  { name: 'Smoke Pellet', desc: 'Écran de fumée tactique', icon: 'fa-cloud' },
  { name: 'Bat-Signal', desc: 'Appel aux alliés', icon: 'fa-lightbulb' },
  { name: 'Utility Belt', desc: 'Ceinture multi-outils', icon: 'fa-toolbox' },
  { name: 'Cape', desc: 'Planage et dissimulation', icon: 'fa-user-secret' }
]

function isBlocked (username) {
  const entry = failedAttempts.get(username)
  if (!entry) return false

  if (Date.now() < entry.blockedUntil) return true

  if (entry.blockedUntil > 0) {
    failedAttempts.delete(username)
  }

  return false
}

function recordFailure (username) {
  const entry = failedAttempts.get(username) || { count: 0, blockedUntil: 0 }
  entry.count += 1

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_DURATION_MS
    entry.count = 0
  }

  failedAttempts.set(username, entry)
}

function clearFailures (username) {
  failedAttempts.delete(username)
}

function logAccess (username) {
  db.prepare('INSERT INTO logs (username, timestamp) VALUES (?, datetime(\'now\'))').run(
    username
  )
}

app.post('/register', async (req, res) => {
  let { username, password } = req.body

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).send('Identifiants invalides.')
  }

  username = username.trim()

  if (username.includes(' ')) {
    return res.status(400).send("Le nom d'utilisateur ne doit pas contenir d'espaces.")
  }

  if (!username) {
    return res.status(400).send("Le nom d'utilisateur est requis.")
  }

  if (password.length < 8) {
    return res.status(400).send('Le mot de passe doit contenir au moins 8 caractères.')
  }

  const hash = await bcrypt.hash(password, 10)
  const adminCount = db
    .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'")
    .get().count
  const role = adminCount === 0 ? 'ADMIN' : 'USER'

  try {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
      username,
      hash,
      role
    )
    res.status(201).send('Justicier enregistré avec succès !')
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).send("Erreur : ce nom d'utilisateur est déjà utilisé.")
    }
    res.status(500).send('Erreur serveur.')
  }
})

const checkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Batcave"')
    return res.status(401).send('Authentification requise')
  }

  const base64 = authHeader.split(' ')[1]
  const decoded = Buffer.from(base64, 'base64').toString()
  const separatorIndex = decoded.indexOf(':')
  const username = decoded.slice(0, separatorIndex)
  const password = decoded.slice(separatorIndex + 1)

  if (isBlocked(username)) {
    return res
      .status(429)
      .send('Trop de tentatives. Réessayez dans 30 secondes.')
  }

  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username)

  if (!user || !(await bcrypt.compare(password, user.password))) {
    recordFailure(username)
    res.setHeader('WWW-Authenticate', 'Basic realm="Batcave"')
    return res.status(401).send('Identifiants invalides')
  }

  clearFailures(username)

  if (user.role !== 'ADMIN') {
    return res.status(403).send('Accès refusé')
  }

  req.user = user
  logAccess(user.username)
  next()
}

app.get('/logout', (req, res) => {
  res.setHeader('WWW-Authenticate', 'Basic realm="Batcave"')
  res.status(401).send(`
    <!DOCTYPE html>
    <html lang="fr">
      <head><meta charset="UTF-8"><title>Déconnexion</title></head>
      <body>
        <p>Déconnexion en cours...</p>
        <script>
          sessionStorage.removeItem('batcave_auth')
          fetch('/api/secrets', {
            headers: { Authorization: 'Basic logout:logout' }
          }).finally(() => {
            window.location.href = '/register.html'
          })
        </script>
      </body>
    </html>
  `)
})

app.get('/bat-computer', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'private', 'bat-computer.html'))
})

app.get('/api/secrets', checkAuth, (req, res) => {
  res.json(GADGETS)
})

app.get('/api/me', checkAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role })
})

app.post('/api/reports', checkAuth, (req, res) => {
  const { content } = req.body

  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).send('Le rapport de mission est requis.')
  }

  const result = db
    .prepare('INSERT INTO reports (user_id, content) VALUES (?, ?)')
    .run(req.user.id, content.trim())

  res.status(201).json({ id: result.lastInsertRowid, message: 'Rapport enregistré.' })
})

app.listen(PORT, () => {
  console.log(`Batcave opérationnelle sur http://localhost:${PORT}`)
})
