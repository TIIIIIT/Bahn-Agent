import { createClient } from 'db-vendo-client'
import { profile as dbwebProfile } from 'db-vendo-client/p/dbweb/index.js'
import { config, STATIONEN } from './config.js'

// dbweb = dieselbe Schnittstelle, die auch die Webseite bahn.de nutzt (inkl. Preise)
const client = createClient(dbwebProfile, config.userAgent)

const pause = ms => new Promise(r => setTimeout(r, ms))

export const RICHTUNGEN = [
  { key: 'hin', von: STATIONEN.freiburg, nach: STATIONEN.berlin },
  { key: 'rueck', von: STATIONEN.berlin, nach: STATIONEN.freiburg },
]

// Nur Fahrten ohne Umstieg (Fußwege werden ignoriert)
function istDirekt(journey) {
  return journey.legs.filter(l => !l.walking).length === 1
}

// Lokale Zeit "YYYY-MM-DDTHH:MM:SS" aus einem ISO-Zeitstempel
const lokaleZeit = iso => iso.slice(0, 19)

// Link, der auf bahn.de die Suche mit genau dieser Verbindung öffnet
export function buchungsLink({ von, nach, abfahrt, klasse }) {
  const p = new URLSearchParams({
    sts: 'true',
    so: von.name,
    zo: nach.name,
    soid: `A=1@L=${von.id}@`,
    zoid: `A=1@L=${nach.id}@`,
    kl: String(klasse),
    hd: lokaleZeit(abfahrt),
    hza: 'D',
  })
  return `https://www.bahn.de/buchung/fahrplan/suche#${p.toString().replace(/\+/g, '%20')}`
}

function zuAngebot(journey, { von, nach, key }, klasse) {
  const fahrt = journey.legs.find(l => !l.walking)
  const abfahrt = fahrt.plannedDeparture || fahrt.departure
  const ankunft = fahrt.plannedArrival || fahrt.arrival
  return {
    id: `${key}|${abfahrt}|${klasse}|${journey.price.amount}`,
    richtung: `${von.name} → ${nach.name}`,
    zug: fahrt.line?.name || 'Zug',
    klasse,
    abfahrt,
    ankunft,
    dauerMin: Math.round((new Date(ankunft) - new Date(abfahrt)) / 60000),
    preis: journey.price.amount,
    waehrung: journey.price.currency || 'EUR',
    hinweis: journey.price.hint || null,
    link: buchungsLink({ von, nach, abfahrt, klasse }),
  }
}

// Günstigste Direktverbindungen eines Tages in einer Richtung und Klasse
export async function sucheTag(richtung, datum, klasse) {
  const res = await client.journeys(richtung.von.id, richtung.nach.id, {
    departure: new Date(`${datum}T00:00:00`),
    transfers: 0,
    firstClass: klasse === 1,
    bestprice: true, // Bestpreissuche über den ganzen Tag
  })
  return (res.journeys || [])
    .filter(istDirekt)
    .filter(j => j.price && typeof j.price.amount === 'number')
    .map(j => zuAngebot(j, richtung, klasse))
}

function datumListe(tage) {
  const liste = []
  const d = new Date()
  for (let i = 1; i <= tage; i++) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i)
    const mm = String(t.getMonth() + 1).padStart(2, '0')
    const dd = String(t.getDate()).padStart(2, '0')
    liste.push(`${t.getFullYear()}-${mm}-${dd}`)
  }
  return liste
}

// Durchsucht alle Tage, beide Richtungen, 1. und 2. Klasse
export async function sucheAlle({
  tage = config.tageVoraus,
  klassen = config.klassen,
  richtungen = RICHTUNGEN,
  log = console.log,
} = {}) {
  const ergebnisse = []
  const fehler = []
  for (const datum of datumListe(tage)) {
    for (const richtung of richtungen) {
      for (const klasse of klassen) {
        try {
          ergebnisse.push(...await sucheTag(richtung, datum, klasse))
        } catch (err) {
          fehler.push({ datum, richtung: richtung.key, klasse, fehler: err.message })
          log(`Fehler ${datum} ${richtung.key} ${klasse}. Kl.: ${err.message}`)
        }
        await pause(config.pauseMs)
      }
    }
  }
  // Doppelte entfernen (Bestpreissuche kann Fahrten mehrfach liefern)
  const eindeutig = [...new Map(ergebnisse.map(a => [a.id, a])).values()]
  eindeutig.sort((a, b) => a.preis - b.preis || a.abfahrt.localeCompare(b.abfahrt))
  return { angebote: eindeutig, fehler }
}
