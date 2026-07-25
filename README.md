# Maschinenverwaltung

Digitale Maschinenverwaltung mit QR-Code-gestützter Entnahme und Rückgabe – MVP.

## Inhaltsverzeichnis

1. [Zweck der Anwendung](#1-zweck-der-anwendung)
2. [Fachlicher Funktionsumfang](#2-fachlicher-funktionsumfang)
3. [Architektur](#3-architektur)
4. [Voraussetzungen](#4-voraussetzungen)
5. [Lokale Installation](#5-lokale-installation)
6. [Umgebungsvariablen](#6-umgebungsvariablen)
7. [Supabase-Projekt anlegen](#7-supabase-projekt-anlegen)
8. [DATABASE_URL einrichten](#8-database_url-einrichten)
9. [Lokale PostgreSQL-Nutzung mit Docker](#9-lokale-postgresql-nutzung-mit-docker)
10. [Migrationen ausführen](#10-migrationen-ausführen)
11. [Testdaten einspielen](#11-testdaten-einspielen)
12. [Administrator-Passwort-Hash erzeugen](#12-administrator-passwort-hash-erzeugen)
13. [Anwendung lokal starten](#13-anwendung-lokal-starten)
14. [Tests ausführen](#14-tests-ausführen)
15. [Ende-zu-Ende-Prüfung](#15-ende-zu-ende-prüfung)
16. [Linting ausführen](#16-linting-ausführen)
17. [TypeScript-Prüfung ausführen](#17-typescript-prüfung-ausführen)
18. [Produktions-Build erstellen](#18-produktions-build-erstellen)
19. [Deployment](#19-deployment)
20. [PUBLIC_BASE_URL konfigurieren](#20-public_base_url-konfigurieren)
21. [QR-Codes verwenden](#21-qr-codes-verwenden)
22. [Stammdaten über die Anwendung pflegen](#22-stammdaten-über-die-anwendung-pflegen)
23. [Stammdaten über den Supabase-Tabelleneditor pflegen](#23-stammdaten-über-den-supabase-tabelleneditor-pflegen)
24. [Warnung vor direkten operativen Statusänderungen](#24-warnung-vor-direkten-operativen-statusänderungen)
25. [PostgreSQL-Daten exportieren](#25-postgresql-daten-exportieren)
26. [Späterer Umzug auf einen anderen PostgreSQL-Server](#26-späterer-umzug-auf-einen-anderen-postgresql-server)
27. [Geräte- und Zugriffsdaten](#27-geräte--und-zugriffsdaten)
28. [Datenschutz- und Nachvollziehbarkeitshinweis](#28-datenschutz--und-nachvollziehbarkeitshinweis)
29. [Bekannte Einschränkungen des MVP](#29-bekannte-einschränkungen-des-mvp)
30. [Backlog](#30-backlog)

---

## 1. Zweck der Anwendung

Das Unternehmen verfügt über ca. 100 gemeinsam genutzte Maschinen, deren Nutzung bisher teilweise über ein
Papierbuch dokumentiert wird. Dadurch ist häufig unklar, wo sich eine Maschine befindet, wer sie entnommen hat,
wann sie entnommen wurde und wann sie voraussichtlich zurückkommt.

Diese Anwendung ersetzt das Papierbuch durch eine digitale Lösung: Jede Maschine erhält einen individuellen
QR-Code. Durch Scannen öffnet sich eine öffentliche, für diese Maschine spezifische Seite, über die sie entnommen
oder zurückgegeben werden kann – ohne eigenes Benutzerkonto. Ein geschützter Administrationsbereich verwaltet
Stammdaten, Historie und Sonderfälle (Sperren, administrative Rückgabe, Deaktivierung).

## 2. Fachlicher Funktionsumfang

- Öffentliche, QR-Code-basierte Maschinenseite (`/m/{qrToken}`) ohne Login, mit Namensauswahl statt Benutzerkonto
- Entnahme und Rückgabe von Maschinen inkl. Pflicht- und Optionalfeldern (Person, Einsatzort/Projekt, geplante
  Rückgabe, Kommentar)
- Statusmodell `IM_LAGER` → `AUSGELIEHEN` → `IM_LAGER`, zusätzlich `GESPERRT`
- Geschützter Administrationsbereich: Maschinen- und Personenstammdaten, Sperren/Freigeben, administrative
  Rückgabe, Deaktivieren/Reaktivieren, vollständige Historie, QR-Code-Anzeige und -Download
- Vollständige Transaktionshistorie (Entnahme, Rückgabe, administrative Rückgabe, Sperren, Freigeben) sowie ein
  separates, trigger-basiertes Audit-Log für Stammdatenänderungen
- Serverseitige Validierung und Autorisierung aller Schreiboperationen, transaktionale und parallelitätssichere
  Statuswechsel (`SELECT … FOR UPDATE`)

**Nicht Bestandteil des MVP** ist u. a.: direkte Übergabe zwischen Personen, automatische Erinnerungen/
Überfälligkeitsmeldungen, Benachrichtigungen (E-Mail/Teams), Wartungs-/Prüfmanagement, Fotos/Dokumente, mehrere
Administratoren, Rollensystem, Sammel-PDF für QR-Codes. Siehe [Backlog](#30-backlog).

## 3. Architektur

```text
Browser → Next.js-Backend (Route Handler / Server Actions) → PostgreSQL
```

- **Framework:** Next.js (App Router) mit TypeScript, React Server Components und Server Actions
- **UI:** Tailwind CSS, mobil priorisiert, responsive für Smartphone/Tablet/Desktop, deutsche Oberfläche
- **Datenbank:** PostgreSQL (lokal via Docker/nativ oder Supabase als reiner PostgreSQL-Host), Zugriff
  ausschließlich serverseitig über [Drizzle ORM](https://orm.drizzle.team/)
- **Migrationen:** versionierte SQL-Migrationen unter `src/db/migrations`, erzeugt mit `drizzle-kit` und ergänzt
  um handgeschriebene Trigger-Migrationen für das Audit-Log
- **Validierung:** [Zod](https://zod.dev/) für alle Schreiboperationen, serverseitig ausgewertet
- **Authentifizierung:** ein einzelner Administrator, Zugangsdaten über Umgebungsvariablen, Passwort nur gehasht
  (Node `crypto.scrypt`), signierte, `HttpOnly`-Session-Cookies (HMAC-SHA256, siehe `src/lib/auth`)
- **QR-Codes:** serverseitig erzeugt mit der Bibliothek [`qrcode`](https://www.npmjs.com/package/qrcode)
- **Tests:** [Vitest](https://vitest.dev/) für Integrationstests der Service-Schicht und der API-Route-Handler
  gegen eine echte PostgreSQL-Testdatenbank
- **Keine Supabase-Bindung im Code:** Es wird ausschließlich der PostgreSQL-Standardtreiber (`postgres`/
  `postgres-js`) verwendet. Supabase kann als Hosting-Provider für PostgreSQL genutzt werden, ist aber jederzeit
  gegen einen anderen PostgreSQL-Server austauschbar (siehe [Abschnitt 26](#26-späterer-umzug-auf-einen-anderen-postgresql-server)).

### Projektstruktur

```text
src/
  app/
    m/[qrToken]/          Öffentliche Maschinenseite
    admin/                 Login + geschützter Adminbereich (Route-Gruppe "(protected)")
    api/public/             Öffentliche API (siehe Abschnitt 2 im Lastenheft)
    api/admin/               QR-Code-PNG-Auslieferung (admin-only)
  components/
    public/                 Öffentliche UI-Komponenten
    admin/                  Admin-UI-Komponenten
  db/
    schema/                 Drizzle-Tabellendefinitionen
    migrations/             Versionierte SQL-Migrationen (inkl. Trigger)
    seed/                   Seed-Logik (fiktive Testdaten)
  lib/
    auth/                   Passwort-Hashing, Session, Routenschutz
    validation/              Zod-Schemas
    device-data/             Geräte-/Zugriffsdaten (IP, User-Agent, Geräte-ID)
    ui-texts.ts              Zentrale Ablage aller Anzeigetexte
  services/
    machines/, people/, transactions/, audit/   Geschäftslogik (nicht in Komponenten/Routen)
tests/                      Vitest-Integrationstests
```

## 4. Voraussetzungen

- Node.js ≥ 20 und npm
- Eine PostgreSQL-Datenbank (lokal via Docker **oder** nativ installiertes PostgreSQL **oder** Supabase)
- Optional: Docker/Docker Compose für die lokale Datenbank

## 5. Lokale Installation

```bash
npm install
cp .env.example .env.local   # anschließend Werte eintragen, siehe Abschnitt 6
```

## 6. Umgebungsvariablen

Alle Variablen sind in [`​.env.example`](./.env.example) dokumentiert:

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | Verbindung zur Hauptdatenbank (`postgres://user:pass@host:port/db`) |
| `TEST_DATABASE_URL` | Separate Datenbank für automatisierte Tests |
| `PUBLIC_BASE_URL` | Basis-URL für QR-Code-Ziele (`{PUBLIC_BASE_URL}/m/{qrToken}`) |
| `ADMIN_USERNAME` | Benutzername des einzigen Administrators |
| `ADMIN_PASSWORD_HASH` | Gehashtes Administrator-Passwort (siehe [Abschnitt 12](#12-administrator-passwort-hash-erzeugen)) |
| `SESSION_SECRET` | Geheimer Schlüssel zum Signieren der Admin-Session (≥ 32 Zeichen) |

`.env.local` wird nicht versioniert (siehe `.gitignore`). Es dürfen **niemals** reale Geheimnisse in
`.env.example` oder das Repository eingetragen werden.

## 7. Supabase-Projekt anlegen

1. Unter [supabase.com](https://supabase.com) ein neues Projekt anlegen.
2. Unter **Project Settings → Database → Connection string** die PostgreSQL-Verbindungszeichenfolge kopieren
   (empfohlen: „Session pooler“ oder „Direct connection“, je nach Netzwerksituation).
3. Die Zeichenfolge als `DATABASE_URL` in `.env.local` (lokal) bzw. in den Umgebungsvariablen der
   Hosting-Plattform (Produktion) hinterlegen.
4. Supabase wird ausschließlich als PostgreSQL-Host verwendet. Es werden **keine** Supabase-Client-Bibliotheken,
   Row-Level-Security-Policies oder sonstigen proprietären Supabase-Funktionen vorausgesetzt.

## 8. DATABASE_URL einrichten

Format: `postgres://BENUTZER:PASSWORT@HOST:PORT/DATENBANK`. Für lokale Entwicklung siehe
[Abschnitt 9](#9-lokale-postgresql-nutzung-mit-docker), für Supabase siehe [Abschnitt 7](#7-supabase-projekt-anlegen).

## 9. Lokale PostgreSQL-Nutzung mit Docker

Eine optionale `docker-compose.yml` startet eine lokale PostgreSQL-Instanz inkl. separater Testdatenbank:

```bash
docker compose up -d
```

Die Standard-Zugangsdaten entsprechen `.env.example` (Benutzer/Passwort `machine_list`, Datenbanken
`machine_list` und `machine_list_test`, Port `5432`). Alternativ kann eine bereits vorhandene, native
PostgreSQL-Installation verwendet werden (siehe `DATABASE_URL`).

## 10. Migrationen ausführen

```bash
npm run db:migrate         # Hauptdatenbank (DATABASE_URL)
npm run db:migrate:test    # Testdatenbank (TEST_DATABASE_URL)
```

Die Migrationen sind versioniert (`src/db/migrations/000x_*.sql`), reproduzierbar und laufen auf einer leeren
PostgreSQL-Datenbank durch. Sie legen Tabellen, Fremdschlüssel, Unique- und Check-Constraints, Indizes sowie die
Audit-Trigger für `machines` und `people` an. Neue Schemaänderungen werden über `npm run db:generate`
(Drizzle-Kit) bzw. `npx drizzle-kit generate --custom` (für Trigger/SQL, das nicht aus dem Schema ableitbar ist)
als neue Migration ergänzt – niemals werden bestehende Migrationen nachträglich verändert.

## 11. Testdaten einspielen

```bash
npm run db:seed         # Hauptdatenbank
npm run db:seed:test    # Testdatenbank
```

Der Seed enthält ausschließlich fiktive Daten: 8 aktive Mitarbeiter, 3 aktive Subunternehmer, 1 inaktive Person,
10 Maschinen (6 im Lager, 2 ausgeliehen, 1 gesperrt, 1 deaktiviert) inkl. konsistenter Historieneinträge.

**Der Seed ist nicht inkrementell**, sondern setzt `people`, `machines`, `transactions` und `audit_log` bei jedem
Aufruf vollständig zurück (`TRUNCATE … RESTART IDENTITY CASCADE`) und legt den definierten Ausgangszustand neu
an. Das macht Testläufe und Vorführungen reproduzierbar, unabhängig davon, wie oft der Seed zuvor ausgeführt
wurde. Die Kernlogik liegt in `src/db/seed/seedDatabase.ts` und wird sowohl vom CLI-Skript als auch von den
automatisierten Tests verwendet.

## 12. Administrator-Passwort-Hash erzeugen

```bash
npm run create-password-hash -- "MeinSicheresPasswort"
```

Die Ausgabe (Format `scrypt:N:r:p:salt:hash`) wird als `ADMIN_PASSWORD_HASH` in die Umgebungsvariablen
eingetragen. Es wird niemals ein Klartextpasswort gespeichert.

## 13. Anwendung lokal starten

```bash
npm run dev
```

Anschließend: `http://localhost:3000` (öffentliche Startseite) bzw. `http://localhost:3000/admin/login`
(Administration).

## 14. Tests ausführen

```bash
npm run db:migrate:test
npm run test
```

Die Tests laufen gegen `TEST_DATABASE_URL` (siehe `tests/setup.ts`) und setzen die Testdatenbank vor **jedem**
Testfall über den Seed zurück, um parallele Zustände und Testisolation sicherzustellen. Abgedeckt werden u. a.
Entnahme/Rückgabe (Normal- und Fehlerfälle, Parallelität), Administration (Login-Grundlagen, Sperren/Freigeben,
administrative Rückgabe, Deaktivierung, Audit-Log) sowie Sicherheit (keine sensiblen Felder in der öffentlichen
API, serverseitige Ablehnung manipulierter Eingaben). Details siehe `tests/`.

## 15. Ende-zu-Ende-Prüfung

Ein dediziertes E2E-Framework (Playwright) ist nicht fest in die automatisierte Test-Pipeline integriert, wurde
aber während der Entwicklung zur visuellen/funktionalen Prüfung verwendet. Für eine manuelle Prüfung:

**Öffentlicher Ablauf:**
1. `/m/{qrToken}` einer Maschine mit Status „Im Lager“ öffnen.
2. Person auswählen, „Maschine entnehmen“ betätigen → Status wechselt zu „Ausgeliehen“.
3. Erneut öffnen, andere Person auswählen, „Maschine zurückgeben“ betätigen → Status wechselt zu „Im Lager“.

**Administrativer Ablauf:**
1. `/admin/login` mit Administrator-Zugangsdaten anmelden.
2. Eine Maschine im Lager öffnen und sperren (`/admin/machines/{id}`).
3. Die öffentliche Seite derselben Maschine aufrufen → Status „Gesperrt“, keine Aktionen verfügbar.
4. Maschine im Adminbereich freigeben.
5. Öffentliche Seite erneut prüfen → Status wieder „Im Lager“, Entnahme möglich.

## 16. Linting ausführen

```bash
npm run lint
```

## 17. TypeScript-Prüfung ausführen

```bash
npm run typecheck
```

## 18. Produktions-Build erstellen

```bash
npm run build
```

## 19. Deployment

Die Anwendung ist ein Standard-Next.js-Projekt und kann auf jeder Node.js-fähigen Hosting-Plattform betrieben
werden (z. B. Vercel oder ein eigener Node-Server via `npm run build && npm run start`). Vorher müssen die in
[Abschnitt 6](#6-umgebungsvariablen) genannten Umgebungsvariablen auf der Zielplattform gesetzt werden. Es
werden keine Umgebungsvariablen oder Datenbank-Zugangsdaten an den Browser übertragen – der Datenbankzugriff
erfolgt ausschließlich serverseitig.

## 20. PUBLIC_BASE_URL konfigurieren

`PUBLIC_BASE_URL` muss auf die öffentlich erreichbare Basis-URL der Produktivumgebung gesetzt werden (z. B.
`https://maschinen.beispiel-firma.de`), da sie zur Erzeugung der QR-Code-Ziel-URLs (`{PUBLIC_BASE_URL}/m/
{qrToken}`) verwendet wird. Nach einer Änderung dieser Variable müssen ggf. bereits gedruckte QR-Codes neu
erzeugt und angebracht werden, falls sich die Domain ändert.

## 21. QR-Codes verwenden

Im Administrationsbereich (`/admin/machines/{id}`) wird der QR-Code jeder Maschine angezeigt und kann als PNG
heruntergeladen werden (Zielauflösung 600×600 px). Der QR-Code kodiert `{PUBLIC_BASE_URL}/m/{qrToken}` und wurde
mit realistisch langen Ziel-URLs getestet. Es gibt im MVP kein Sammel-PDF – jeder QR-Code wird einzeln
heruntergeladen und z. B. auf der Maschine angebracht.

## 22. Stammdaten über die Anwendung pflegen

Maschinen- und Personenstammdaten werden im Regelfall über den Administrationsbereich gepflegt
(`/admin/machines`, `/admin/people`). Jede Änderung wird serverseitig validiert, autorisiert und im Audit-Log
protokolliert.

## 23. Stammdaten über den Supabase-Tabelleneditor pflegen

**Stammdaten dürfen bei Bedarf direkt über den Supabase-Tabelleneditor (oder einen anderen Datenbankclient)
gepflegt werden**, z. B. Korrekturen an Name, Hersteller, Kontaktdaten o. Ä. Ein Datenbank-Trigger protokolliert
solche direkten Änderungen automatisch im `audit_log` (mit `database_user`, aber ohne `admin_username`, da diese
Information dem Trigger nicht vorliegt).

## 24. Warnung vor direkten operativen Statusänderungen

**Operative Felder sollen ausschließlich über die Anwendung geändert werden**, nicht direkt über den
Tabelleneditor:

- `status`, `current_person_id`, `current_checkout_at`, `current_planned_return_date`,
  `current_project_or_location` (Tabelle `machines`)

Direkte Änderungen an diesen Feldern umgehen die Geschäftslogik (Transaktionshistorie, Konsistenzprüfungen,
Sperrlogik) und können zu inkonsistenten Zuständen führen (z. B. „ausgeliehen“ ohne zugehörige
Entnahme-Transaktion). Die Datenbank sichert die grundlegende Konsistenz zusätzlich über Check-Constraints ab
(siehe Migration `0000_init.sql`), verhindert aber keine fachlich unsinnigen Änderungen wie einen doppelten
Statuswechsel ohne Historieneintrag.

## 25. PostgreSQL-Daten exportieren

Mit Standard-PostgreSQL-Bordmitteln, unabhängig vom Hosting-Anbieter:

```bash
pg_dump "$DATABASE_URL" > backup.sql
```

Bei Supabase ist alternativ ein Export über das Dashboard (**Database → Backups**) möglich.

## 26. Späterer Umzug auf einen anderen PostgreSQL-Server

Da ausschließlich der PostgreSQL-Standardtreiber verwendet wird, ist ein Umzug (z. B. weg von Supabase) ohne
Codeänderungen möglich:

1. Daten exportieren: `pg_dump "$DATABASE_URL" > backup.sql`
2. Zieldatenbank bereitstellen (leere PostgreSQL-Instanz, Version ≥ 14 empfohlen)
3. Daten einspielen: `psql "$NEUE_DATABASE_URL" < backup.sql` **oder** Migrationen frisch anwenden
   (`npm run db:migrate`) und Daten separat migrieren
4. `DATABASE_URL` (und ggf. `PUBLIC_BASE_URL`) auf der Zielplattform aktualisieren

## 27. Geräte- und Zugriffsdaten

Bei jeder Entnahme und Rückgabe über die öffentliche Anwendung werden zusätzlich zu den fachlichen Angaben
**Geräte- und Zugriffsdaten** gespeichert: eine beim ersten Aufruf im Browser zufällig erzeugte Geräte-ID
(`localStorage`, kein Fingerprinting), die IP-Adresse, der User-Agent sowie daraus abgeleitet Browser,
Betriebssystem und Gerätetyp. Diese Daten dienen ausschließlich der internen Nachvollziehbarkeit und werden
öffentlichen Nutzern **nicht** angezeigt – nur im Administrationsbereich über die Transaktionshistorie
grundsätzlich vorhanden (aktuell nicht in der UI dargestellt, siehe Backlog).

**Wichtige Einschränkung zur IP-Adresse:** Die Anwendung kann hinter einem Proxy oder Hostinganbieter betrieben
werden. Der `X-Forwarded-For`-Header ist grundsätzlich clientseitig beeinflussbar und wird nur dann als
verlässlich behandelt, wenn die Hostingumgebung sicherstellt, dass eingehende Verbindungen ausschließlich über
den kontrollierten Proxy erfolgen. Die gespeicherte Geräte-ID ist ebenfalls **kein rechtssicherer
Identitätsnachweis**, sondern ein Hilfsmittel zur Nachvollziehbarkeit.

## 28. Datenschutz- und Nachvollziehbarkeitshinweis

Die Anwendung verarbeitet personenbezogene Daten (Namen, ggf. Kontaktdaten, Nutzungshistorie,
Geräte-/Zugriffsdaten). Vor dem produktiven Einsatz sollte geprüft werden, ob eine Information der Mitarbeiter
und Subunternehmer über die Verarbeitung erforderlich ist (z. B. Aushang, Datenschutzhinweis) und ob interne
Vorgaben zur Aufbewahrungsdauer der Historie bestehen. Diese Anwendung trifft dazu keine rechtliche Aussage –
die Umsetzung entsprechender organisatorischer Maßnahmen liegt außerhalb des technischen MVP-Umfangs.

## 29. Bekannte Einschränkungen des MVP

- Genau ein Administrator-Konto, keine Rollen- oder Rechteverwaltung.
- Kein Rate-Limiting (Architektur schließt eine spätere Ergänzung aber nicht aus).
- Kein Sammel-PDF für QR-Codes; jeder Code wird einzeln heruntergeladen.
- Kein dediziertes, in `npm test` integriertes Ende-zu-Ende-Testframework; die Ende-zu-Ende-Prüfung erfolgt
  manuell nach der in [Abschnitt 15](#15-ende-zu-ende-prüfung) beschriebenen Anleitung.
- Ein Test des Admin-API-Routenschutzes (`cookies()`-basiert) ließ sich nicht innerhalb der Vitest-Umgebung
  automatisieren, da `next/headers` einen echten Next.js-Request-Scope voraussetzt; der Schutz wurde stattdessen
  manuell gegen den laufenden Server verifiziert (siehe `tests/admin.test.ts`, Kommentar dazu).
- Geräte- und Zugriffsdaten werden gespeichert, aber im Administrationsbereich aktuell nicht separat
  dargestellt (nur implizit in der Datenbank vorhanden).
- Responsive Admin-Tabellen nutzen auf kleinen Bildschirmen horizontales Scrollen innerhalb der Tabelle statt
  einer eigenständigen Kartenansicht.

## 30. Backlog

- **CSV-Import für Mitarbeiter/Subunternehmer und Maschinen** (Massenanlage statt einzeln über das
  Adminformular — wichtig für die Erstbefüllung mit den ca. 100 echten Maschinen und allen Personen)
- Anpassung der Anzeigetexte (zentral abgelegt in `src/lib/ui-texts.ts`, inhaltliche Überarbeitung nicht
  Bestandteil des MVP)
- Direkte Übergabe zwischen Personen
- Automatische Erinnerungen
- Überfälligkeitsmeldungen
- E-Mail- oder Teams-Benachrichtigungen
- Wartungsmanagement
- Prüfmanagement
- Fotos
- Dokumente
- Microsoft-Login
- Mehrere Administratoren
- Rollen- und Berechtigungssystem
- Eigene Domain
- Firmenserver
- Azure
- Professionelles Hosting
- Monitoring
- Backupstrategie
- Reports
- Diagramme
- Excel-Export
- Sammel-PDF für QR-Codes
- Flottenanbieter-Schnittstellen
- Anzeige der Geräte- und Zugriffsdaten im Administrationsbereich
- Kartenansicht für Admin-Tabellen auf kleinen Bildschirmen (statt horizontalem Scrollen)
- Automatisierte Ende-zu-Ende-Tests (z. B. Playwright) als Teil von `npm test`
