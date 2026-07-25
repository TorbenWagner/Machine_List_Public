import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, type AuditEntityType } from "@/db/schema";

type TxLike = Pick<typeof db, "execute">;

/**
 * Setzt den Administrator-Benutzernamen als transaktionslokale Postgres-
 * Session-Variable, damit der Audit-Trigger (siehe Migration
 * 0001_audit_triggers.sql) ihn den erzeugten audit_log-Eintraegen zuordnen
 * kann. Wird ueber set_config() mit gebundenem Parameter gesetzt, damit
 * keine SQL-Injection ueber den Benutzernamen moeglich ist.
 */
export async function setAuditContext(tx: TxLike, adminUsername: string | null) {
  await tx.execute(sql`select set_config('app.admin_username', ${adminUsername ?? ""}, true)`);
}

export async function getAuditLogForEntity(entityType: AuditEntityType, entityId: string) {
  return db
    .select()
    .from(auditLog)
    .where(sql`${auditLog.entityType} = ${entityType} AND ${auditLog.entityId} = ${entityId}`)
    .orderBy(desc(auditLog.createdAt));
}
