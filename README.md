# FCSG Tippspiel

Webbasiertes Tippspiel für Spiele des FC St. Gallen. Die Anwendung basiert auf Next.js und Supabase und enthält neben der Tippabgabe eine Rangliste, Resultate, einen Live-Ticker, Push-Benachrichtigungen und einen geschützten Admin-Bereich.

## Funktionen

- Registrierung und Login über Supabase Auth
- Tipps bis zum Anpfiff abgeben und ändern
- Serverseitige Tipp-Sperre über Supabase RLS
- Rangliste und vergangene Resultate
- Import von FCSG-Spielen über API-Football
- Live-Synchronisation von Spielstand, Ereignissen, Statistiken und Aufstellungen
- Web-Push-Benachrichtigungen zu Spielen
- Recovery-Job für liegengebliebene abgeschlossene Spiele
- Separater Admin-Bereich für Spielverwaltung

## Technischer Stack

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, RLS)
- Vercel
- API-Football
- Web Push / VAPID

## Lokale Entwicklung

Voraussetzungen: Node.js 22 oder neuer und ein konfiguriertes Supabase-Projekt.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Danach ist die Anwendung standardmässig unter `http://localhost:3000` erreichbar.

## Umgebungsvariablen

Alle benötigten Variablen sind in `.env.example` dokumentiert. Secrets dürfen nie in Git eingecheckt oder als `NEXT_PUBLIC_` Variable veröffentlicht werden.

Benötigt werden:

- Supabase URL, Publishable Key und Secret Key
- Admin-Benutzername, Admin-Passwort und Session-Secret
- API-Football Key
- `CRON_SECRET` für externe Scheduler
- VAPID Public/Private Key und Subject für Push-Benachrichtigungen

## Live-Sync und Recovery

`/api/live-sync` ist für den externen Scheduler vorgesehen und muss mit folgendem Header aufgerufen werden:

```text
Authorization: Bearer <CRON_SECRET>
```

Der Live-Sync besitzt zusätzlich einen globalen 60-Sekunden-Throttle. `/api/recover-stale` verwendet denselben Secret-Mechanismus und korrigiert ältere Spiele, die ausnahmsweise nicht als beendet übernommen wurden.

## Sicherheit

- Row Level Security ist auf den öffentlichen Anwendungstabellen aktiv.
- Nutzer können nur eigene Tipps erstellen und ändern.
- Tippänderungen werden nach dem Anpfiff serverseitig blockiert.
- Service-/Secret-Keys werden ausschliesslich serverseitig verwendet.
- Admin-Login-Versuche werden rate-limitiert.
- Admin-Sessions werden ungültig, sobald Admin-Zugangsdaten geändert werden.

## Qualitätsprüfung

```bash
npm run check
```

Der Check führt ESLint und einen vollständigen Next.js Production Build aus. Dasselbe wird für Pull Requests und Pushes auf `main` über GitHub Actions ausgeführt.

## Deployment

Die Produktionsanwendung wird über Vercel ausgeliefert. Änderungen sollten über einen Pull Request nach `main` gelangen, damit der CI-Check vor dem Merge ausgeführt wird.
