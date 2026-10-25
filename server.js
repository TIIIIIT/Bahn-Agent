// Kleine REST-API rund um die Suche
//   GET  /api/angebote?tage=14&maxPreis=30&klasse=2&richtung=hin
//   POST /api/pruefen            (sucht und mailt neue Treffer)
//   POST /api/pruefen?dryRun=1   (sucht, mailt nicht)
//   GET  /api/status
import express from 'express'
import { config } from './src/config.js'
import { sucheAlle, RICHTUNGEN } from './src/bahn.js'
import { pruefen } from './src/pruefen.js'

const app = express()
const PORT = Number(process.env.PORT || 3000)

// Optionaler Schutz: Header "x-api-token" muss API_TOKEN entsprechen
app.use((req, res, next) => {
  if (!process.env.API_TOKEN || req.get('x-api-token') === process.env.API_TOKEN) return next()
  res.status(401).json({ fehler: 'Ungültiger oder fehlender x-api-token' })
})

let laeuft = false
let letzterLauf = null

app.get('/api/status', (req, res) => {
  res.json({ laeuft, letzterLauf, config: { ...config, empfaenger: config.empfaenger } })
})

app.get('/api/angebote', async (req, res) => {
  const tage = Math.min(Number(req.query.tage) || 7, 180)
  const maxPreis = req.query.maxPreis !== undefined ? Number(req.query.maxPreis) : Infinity
  const klassen = req.query.klasse ? [Number(req.query.klasse)] : config.klassen
  const richtungen = req.query.richtung
    ? RICHTUNGEN.filter(r => r.key === req.query.richtung)
    : RICHTUNGEN
  try {
    const { angebote, fehler } = await sucheAlle({ tage, klassen, richtungen, log: () => {} })
    res.json({ anzahl: angebote.length, angebote: angebote.filter(a => a.preis <= maxPreis), fehler })
  } catch (err) {
    res.status(502).json({ fehler: err.message })
  }
})

app.post('/api/pruefen', async (req, res) => {
  if (laeuft) return res.status(409).json({ fehler: 'Eine Prüfung läuft bereits' })
  laeuft = true
  try {
    const r = await pruefen({
      dryRun: req.query.dryRun === '1',
      tage: req.query.tage ? Number(req.query.tage) : undefined,
      log: () => {},
    })
    letzterLauf = { zeit: new Date().toISOString(), treffer: r.treffer.length, neu: r.neu.length, mailGesendet: r.mailGesendet }
    res.json(r)
  } catch (err) {
    res.status(500).json({ fehler: err.message })
  } finally {
    laeuft = false
  }
})

// Optional: automatisch prüfen, z. B. CHECK_INTERVALL_MIN=180
const intervall = Number(process.env.CHECK_INTERVALL_MIN || 0)
if (intervall > 0) {
  setInterval(async () => {
    if (laeuft) return
    laeuft = true
    try {
      const r = await pruefen()
      letzterLauf = { zeit: new Date().toISOString(), treffer: r.treffer.length, neu: r.neu.length, mailGesendet: r.mailGesendet }
    } catch (err) {
      console.error('Automatische Prüfung fehlgeschlagen:', err.message)
    } finally {
      laeuft = false
    }
  }, intervall * 60_000)
}

app.listen(PORT, () => console.log(`Bahn-API läuft auf http://localhost:${PORT}`))
