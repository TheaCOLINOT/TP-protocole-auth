require('dotenv').config()

const express = require('express')
const session = require('express-session')
const SqliteStore = require('better-sqlite3-session-store')(session)
const db = require('./config/db')
const authRouter = require('./routes/auth')
const batcomputerRouter = require('./routes/batcomputer')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

app.use(
  session({
    store: new SqliteStore({
      client: db,
      expired: {
        clear: true,
        intervalMs: 900000
      }
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'bat_identity',
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 1800000
    }
  })
)

app.use('/auth', authRouter)
app.use(batcomputerRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`)
})
