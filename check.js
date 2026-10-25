#!/usr/bin/env node
// Einmaliger Lauf – z. B. per Cronjob oder GitHub Actions
//   node check.js            → suchen und bei Treffern mailen
//   node check.js --dry-run  → nur anzeigen, keine Mail
//   node check.js --tage=7   → nur die nächsten 7 Tage
import { pruefen } from './src/pruefen.js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const tageArg = args.find(a => a.startsWith('--tage='))
const tage = tageArg ? Number(tageArg.split('=')[1]) : undefined

pruefen({ dryRun, tage })
  .then(r => process.exit(r.fehler.length && !r.gesamt ? 1 : 0))
  .catch(err => {
    console.error('Abbruch:', err)
    process.exit(1)
  })
