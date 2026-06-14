require('dotenv').config()

const express = require('express')
const authRouter = require('./routes/auth')
const batcomputerRouter = require('./routes/batcomputer')

const app = express()

app.use(express.json())
app.use(express.static('public'))
app.use('/auth', authRouter)
app.use(batcomputerRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`)
})
