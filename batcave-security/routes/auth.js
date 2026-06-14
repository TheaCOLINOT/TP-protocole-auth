const express = require('express')
const path = require('path')
const bcrypt = require('bcrypt')
const db = require('../config/db')

const router = express.Router()

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'register.html'))
})

router.post('/register', async (req, res) => {
  const { username, password } = req.body
  const hash = await bcrypt.hash(password, 10)

  try {
    const insert = db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    )
    insert.run(username, hash)
    res.status(201).send('Utilisateur créé avec succès !')
  } catch (err) {
    res.status(409).send("Erreur : l'utilisateur existe déjà.")
  }
})

module.exports = router
