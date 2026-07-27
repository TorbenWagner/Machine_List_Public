@AGENTS.md

# Projektkontext für Claude Code

Digitale Maschinenverwaltung (MVP) für Aderhold: QR-Code-basierte Entnahme/
Rückgabe von Maschinen ohne individuelles Benutzerkonto, plus geschützter
Administrationsbereich. Vollständige fachliche und technische Dokumentation
steht in [`README.md`](./README.md) (Architektur, Setup, Umgebungsvariablen,
Backlog, bekannte Einschränkungen) – dort zuerst nachsehen.

## Firmenweite Konventionen

Dieses Projekt folgt den in **`aderhold-tech-standards`** (separates,
privates Repository) festgehaltenen Konventionen (Tech-Stack, Auth-Muster,
Projektstruktur, Testansatz). Bei neuen, größeren Änderungen dieses Projekts
lohnt sich ein Blick dorthin, um Konsistenz mit anderen Aderhold-Projekten
zu wahren – und neue, wiederverwendbare Erkenntnisse aus diesem Projekt
sollten dort ergänzt werden, nicht nur hier.

## Projektspezifische Eckpunkte (Kurzfassung, Details in README.md)

- Zwei getrennte Auth-Ebenen: Admin-Login (`/admin/login`,
  `ADMIN_PASSWORD_HASH`) und ein gemeinsames Zugangspasswort für die
  öffentliche QR-Anwendung (`/zugang`, `PUBLIC_ACCESS_PASSWORD_HASH`) –
  unterschiedliche Cookies, unterschiedliche Gültigkeitsdauern.
- Datenbank: PostgreSQL über Drizzle ORM; lokal per Docker (`docker-compose.yml`)
  oder Supabase (nur als reiner PostgreSQL-Host, keine `supabase-js`-Abhängigkeit).
- Seed (`npm run db:seed`) ist **nicht inkrementell** – setzt Testdaten bei
  jedem Aufruf vollständig zurück (siehe `src/db/seed/seedDatabase.ts`).
- Tests laufen gegen eine echte Postgres-Testdatenbank (`TEST_DATABASE_URL`),
  keine Mocks. `next/headers`-`cookies()` lässt sich nicht direkt in
  Vitest aufrufen (Request-Scope-Fehler) – API-Routen lesen Zugangs-Cookies
  daher über `request.cookies` statt über `next/headers`.
- Vor jedem Commit: `npm run lint`, `npm run typecheck`, `npm run test`,
  `npm run build` – alle vier müssen grün sein.
- Commits/Pushes nur nach expliziter Aufforderung des Nutzers.
