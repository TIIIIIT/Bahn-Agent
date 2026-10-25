import nodemailer from 'nodemailer'
import { config } from './config.js'

const fmtZeit = iso => new Date(iso).toLocaleString('de-DE', {
  weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})
const fmtUhr = iso => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
const fmtPreis = a => `${a.preis.toFixed(2).replace('.', ',')} ${a.waehrung === 'EUR' ? '€' : a.waehrung}`
const fmtDauer = m => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`

export function zusammenfassung(a) {
  return `${a.richtung} · ${fmtZeit(a.abfahrt)} → ${fmtUhr(a.ankunft)} · ${a.zug} · ` +
    `${a.klasse}. Klasse · ${fmtDauer(a.dauerMin)} · direkt · ${fmtPreis(a)}`
}

function textMail(angebote) {
  return [
    `${angebote.length} neue(s) Bahn-Angebot(e) bis ${config.maxPreis} € (Direktverbindung):`,
    '',
    ...angebote.map(a => `• ${zusammenfassung(a)}${a.hinweis ? ` (${a.hinweis})` : ''}\n  Buchen: ${a.link}`),
    '',
    'Hinweis: Sparpreise sind kontingentiert und können schnell vergriffen sein.',
  ].join('\n')
}

function htmlMail(angebote) {
  const zeilen = angebote.map(a => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #ddd">${a.richtung}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd">${fmtZeit(a.abfahrt)} – ${fmtUhr(a.ankunft)}<br><small>${fmtDauer(a.dauerMin)}, direkt</small></td>
      <td style="padding:8px;border-bottom:1px solid #ddd">${a.zug}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd">${a.klasse}. Kl.</td>
      <td style="padding:8px;border-bottom:1px solid #ddd"><b>${fmtPreis(a)}</b></td>
      <td style="padding:8px;border-bottom:1px solid #ddd"><a href="${a.link}">Zum Angebot</a></td>
    </tr>`).join('')
  return `
  <div style="font-family:Arial,sans-serif">
    <h2 style="color:#ec0016">Bahn-Angebote bis ${config.maxPreis} €</h2>
    <p>${angebote.length} neue Direktverbindung(en) Freiburg Hbf ↔ Berlin Hbf gefunden:</p>
    <table style="border-collapse:collapse">
      <tr style="text-align:left"><th>Strecke</th><th>Zeit</th><th>Zug</th><th>Klasse</th><th>Preis</th><th></th></tr>
      ${zeilen}
    </table>
    <p style="color:#666;font-size:12px">Sparpreise sind kontingentiert und können schnell vergriffen sein.</p>
  </div>`
}

export async function sendeAngebote(angebote) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  const guenstigstes = Math.min(...angebote.map(a => a.preis))
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: config.empfaenger.join(', '),
    subject: `🚆 ${angebote.length} Bahn-Angebot(e) Freiburg ↔ Berlin ab ${guenstigstes.toFixed(2).replace('.', ',')} €`,
    text: textMail(angebote),
    html: htmlMail(angebote),
  })
}
