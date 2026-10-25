import 'dotenv/config'

// Alle Datumsangaben in deutscher Zeit
process.env.TZ = 'Europe/Berlin'

const zahl = (wert, standard) => {
  const n = Number(wert)
  return Number.isFinite(n) ? n : standard
}

export const STATIONEN = {
  freiburg: { id: '8000107', name: 'Freiburg(Breisgau) Hbf' },
  berlin: { id: '8011160', name: 'Berlin Hbf' },
}

export const config = {
  // Suchzeitraum: so viele Tage ab morgen werden abgefragt
  tageVoraus: zahl(process.env.TAGE_VORAUS, 60),
  // Preisgrenzen in Euro
  minPreis: zahl(process.env.MIN_PREIS, 0),
  maxPreis: zahl(process.env.MAX_PREIS, 30),
  // Klassen, die durchsucht werden
  klassen: [1, 2],
  // Pause zwischen zwei Anfragen an bahn.de (ms), damit nichts blockiert wird
  pauseMs: zahl(process.env.PAUSE_MS, 1500),
  // Empfänger der Benachrichtigung
  empfaenger: (process.env.EMPFAENGER || 'junesyamm@googlemail.com,schwoerer@posteo.de')
    .split(',').map(s => s.trim()).filter(Boolean),
  userAgent: process.env.USER_AGENT || 'bahn-angebote-skript (privat)',
  // Datei, in der bereits gemeldete Angebote stehen (keine doppelten Mails)
  gemeldetDatei: process.env.GEMELDET_DATEI || 'gemeldet.json',
}
