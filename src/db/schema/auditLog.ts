import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const auditEntityTypeValues = ["MACHINE", "PERSON"] as const;
export type AuditEntityType = (typeof auditEntityTypeValues)[number];

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    reason: text("reason"),
    adminUsername: varchar("admin_username", { length: 100 }),
    databaseUser: varchar("database_user", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_created_at_idx").on(table.createdAt),
    check(
      "audit_log_entity_type_check",
      sql`${table.entityType} IN ('MACHINE', 'PERSON')`,
    ),
  ],
);
