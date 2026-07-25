-- Audit-Trigger fuer Stammdatenaenderungen an machines und people.
-- Erfasst jede INSERT/UPDATE-Operation (auch direkte Aenderungen ueber den
-- Supabase-Tabelleneditor oder einen anderen Datenbankclient) im audit_log.
--
-- admin_username wird ueber eine Session-Variable (app.admin_username)
-- uebergeben, die die Anwendung vor Stammdatenaenderungen per
-- `SET LOCAL app.admin_username = '...'` innerhalb der Transaktion setzt.
-- Ist die Variable nicht gesetzt (z. B. bei direkter Bearbeitung ueber den
-- Tabelleneditor), bleibt admin_username leer und database_user (aktueller
-- Postgres-Rollenname) dokumentiert den Ursprung der Aenderung.

CREATE OR REPLACE FUNCTION machine_list_audit_trigger() RETURNS trigger AS $$
DECLARE
  v_entity_type text;
  v_admin_username text;
BEGIN
  IF TG_TABLE_NAME = 'machines' THEN
    v_entity_type := 'MACHINE';
  ELSIF TG_TABLE_NAME = 'people' THEN
    v_entity_type := 'PERSON';
  ELSE
    v_entity_type := upper(TG_TABLE_NAME);
  END IF;

  BEGIN
    v_admin_username := current_setting('app.admin_username', true);
  EXCEPTION WHEN OTHERS THEN
    v_admin_username := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, admin_username, database_user)
    VALUES (v_entity_type, NEW.id, 'INSERT', NULL, to_jsonb(NEW), v_admin_username, current_user);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, admin_username, database_user)
    VALUES (v_entity_type, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_admin_username, current_user);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, admin_username, database_user)
    VALUES (v_entity_type, OLD.id, 'DELETE', to_jsonb(OLD), NULL, v_admin_username, current_user);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS machines_audit_trigger ON machines;
CREATE TRIGGER machines_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON machines
  FOR EACH ROW EXECUTE FUNCTION machine_list_audit_trigger();

DROP TRIGGER IF EXISTS people_audit_trigger ON people;
CREATE TRIGGER people_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON people
  FOR EACH ROW EXECUTE FUNCTION machine_list_audit_trigger();

-- Automatische Pflege von updated_at bei jeder Aenderung.
CREATE OR REPLACE FUNCTION machine_list_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS machines_set_updated_at ON machines;
CREATE TRIGGER machines_set_updated_at
  BEFORE UPDATE ON machines
  FOR EACH ROW EXECUTE FUNCTION machine_list_set_updated_at();

DROP TRIGGER IF EXISTS people_set_updated_at ON people;
CREATE TRIGGER people_set_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION machine_list_set_updated_at();
