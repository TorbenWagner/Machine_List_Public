-- Aktiviert Row Level Security (RLS) auf allen fachlichen Tabellen, ohne
-- eigene Policies zu definieren. Ergebnis: Zugriff ueber Supabase's
-- automatische PostgREST-API (Rollen "anon"/"authenticated") wird komplett
-- blockiert, waehrend die eigene, serverseitige Anwendungsverbindung
-- (laeuft als Tabellenbesitzer, siehe DATABASE_URL) unveraendert
-- funktioniert - RLS gilt standardmaessig nicht fuer den Besitzer einer
-- Tabelle bzw. Superuser-Rollen.
--
-- Hintergrund: Diese Anwendung nutzt bewusst keine supabase-js-Bibliothek
-- und keine RLS-Policies fuer den eigenen Datenzugriff (siehe README,
-- Architektur-Abschnitt). Supabase stellt aber unabhaengig davon fuer jedes
-- Projekt automatisch eine REST-API auf Basis von PostgREST bereit, die
-- ohne aktives RLS einen direkten, an der Anwendung vorbeigehenden Zugriff
-- auf die Tabellen erlauben wuerde.

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
