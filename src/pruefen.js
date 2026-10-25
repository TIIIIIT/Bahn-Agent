import fs from 'node:fs'
import { config } from './config.js'
import { sucheAlle } from './bahn.js'
import { sendeAngebote, zusammenfassung } from './mail.js'

function ladeGemeldet() {
  try {
    return new Set(JSON.parse(fs.readFileSync(config.gemeldetDatei, 'utf8')))
  } catch {
    return new Set()
  }
}

function speichereGemeldet(set) {
  // Nur Einträge für künftige Fahrten behalten
  const jetzt = new Date().toISOString()
  const aktuell = [...set].filter(id => (id.split('|')[1] || '') >= jetzt.slice(0, 10))
  fs.writeFileSync(config.gemeldetDatei, JSON.stringify(aktuell, null, 2))
}

// Kompletter Ablauf: suchen → filtern (0–30 €) → nur neue → mailen
export async function pruefen({ dryRun = false, tage, log = console.log } = {}) {
  log(`Suche ${tage ?? config.tageVoraus} Tage, beide Richtungen, 1. + 2. Klasse …`)
  const { angebote, fehler } = await sucheAlle({ tage, log })

  const treffer = angebote.filter(a => a.preis >= config.minPreis && a.preis <= config.maxPreis)
  const gemeldet = ladeGemeldet()
  const neu = treffer.filter(a => !gemeldet.has(a.id))

  log(`${angebote.length} Direktverbindungen mit Preis, ${treffer.length} bis ${config.maxPreis} €, davon ${neu.length} neu.`)
  neu.forEach(a => log('  ' + zusammenfassung(a) + '\n  ' + a.link))

  let mailGesendet = false
  if (neu.length && !dryRun) {
    await sendeAngebote(neu)
    neu.forEach(a => gemeldet.add(a.id))
    speichereGemeldet(gemeldet)
    mailGesendet = true
    log(`Mail an ${config.empfaenger.join(', ')} gesendet.`)
  }

  return { gesamt: angebote.length, treffer, neu, mailGesendet, fehler }
}
