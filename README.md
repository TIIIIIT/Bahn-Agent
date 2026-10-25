# Bahn-Angebote Freiburg Hbf ↔ Berlin Hbf

Sucht auf bahn.de alle **Direktverbindungen** (ohne Umstieg) zwischen Freiburg(Breisgau) Hbf und Berlin Hbf – **hin und zurück, 1. und 2. Klasse**. Jedes Angebot zwischen **0 € und 30 €** wird mit Zusammenfassung und Link per Mail an

- junesyamm@googlemail.com
- schwoerer@posteo.de

geschickt. Schon gemeldete Angebote landen in `gemeldet.json` und werden nicht doppelt verschickt.

Die Preise kommen über [db-vendo-client](https://github.com/public-transport/db-vendo-client) (Profil `dbweb`), also dieselbe Schnittstelle, die die Webseite bahn.de nutzt. Es ist keine offizielle DB-API – wenn die Bahn etwas ändert, hilft meist `npm update db-vendo-client`.

## Einrichten

```bash
npm install
cp .env.example .env     # SMTP-Daten eintragen
npm run check:test       # Probelauf ohne Mail
npm run check            # Echter Lauf mit Mail
```

**Gmail als Absender:** In Google-Konto > Sicherheit die 2-Faktor-Anmeldung aktivieren, dann ein *App-Passwort* erstellen und als `SMTP_PASS` eintragen.

## Regelmäßig laufen lassen

**Variante A – eigener Rechner / Raspberry Pi (Cron):**
```
17 6,12,18 * * * cd /pfad/zu/bahn-angebote && /usr/bin/node check.js >> log.txt 2>&1
```

**Variante B – GitHub Actions (kostenlos, kein eigener Rechner nötig):**
Ordner als privates GitHub-Repo hochladen, unter *Settings > Secrets and variables > Actions* die Werte `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` anlegen. Der Workflow läuft dann 3× täglich.

## API

```bash
npm run api
```

| Aufruf | Funktion |
|---|---|
| `GET /api/angebote?tage=14&maxPreis=30&klasse=2&richtung=hin` | Angebote abfragen (richtung: `hin` = Freiburg→Berlin, `rueck`) |
| `POST /api/pruefen` | Suche + Mail bei neuen Treffern |
| `POST /api/pruefen?dryRun=1` | Suche ohne Mail |
| `GET /api/status` | letzter Lauf, Einstellungen |

Mit `API_TOKEN` in der `.env` muss jeder Aufruf den Header `x-api-token` mitschicken. Mit `CHECK_INTERVALL_MIN=180` prüft der Server selbst alle 3 Stunden.

## Gut zu wissen

- 60 Tage × 2 Richtungen × 2 Klassen = 240 Anfragen, bei 1,5 s Pause ca. 6 Minuten pro Lauf. Mehr Tage (bis ~180) gehen, dauern aber länger.
- Gesucht wird ohne BahnCard, 1 Erwachsener.
- Der Link öffnet auf bahn.de die Suche mit der passenden Strecke, Klasse und Abfahrtszeit; dort den Zug auswählen und buchen.
- Sparpreise sind kontingentiert – zwischen Mail und Buchung kann ein Angebot schon weg sein.
