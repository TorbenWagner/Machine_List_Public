import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { people } from "./people";

export const machineStatusValues = ["IM_LAGER", "AUSGELIEHEN", "GESPERRT"] as const;
export type MachineStatus = (typeof machineStatusValues)[number];

export const ownershipTypeValues = ["EIGENTUM", "FLOTTE"] as const;
export type OwnershipType = (typeof ownershipTypeValues)[number];

export const machines = pgTable(
  "machines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    qrToken: varchar("qr_token", { length: 64 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    manufacturer: varchar("manufacturer", { length: 200 }).notNull(),
    modelName: varchar("model_name", { length: 200 }).notNull(),
    serialNumber: varchar("serial_number", { length: 200 }).notNull(),
    storageLocation: varchar("storage_location", { length: 200 }).notNull(),
    ownershipType: text("ownership_type").notNull(),
    purchaseDate: date("purchase_date", { mode: "string" }).notNull(),
    hiltiScanCode: varchar("hilti_scan_code", { length: 100 }),
    alternativeCode: varchar("alternative_code", { length: 100 }),
    description: text("description"),
    responsiblePersonId: uuid("responsible_person_id").references(
      () => people.id,
    ),
    informationText: text("information_text"),
    status: text("status").notNull().default("IM_LAGER"),
    currentPersonId: uuid("current_person_id").references(() => people.id),
    currentCheckoutAt: timestamp("current_checkout_at", {
      withTimezone: true,
      mode: "date",
    }),
    currentPlannedReturnDate: date("current_planned_return_date", {
      mode: "string",
    }),
    currentProjectOrLocation: varchar("current_project_or_location", {
      length: 300,
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("machines_qr_token_unique").on(table.qrToken),
    uniqueIndex("machines_manufacturer_serial_unique").on(
      table.manufacturer,
      table.serialNumber,
    ),
    uniqueIndex("machines_hilti_scan_code_unique")
      .on(table.hiltiScanCode)
      .where(sql`${table.hiltiScanCode} IS NOT NULL`),
    uniqueIndex("machines_alternative_code_unique")
      .on(table.alternativeCode)
      .where(sql`${table.alternativeCode} IS NOT NULL`),
    check(
      "machines_status_check",
      sql`${table.status} IN ('IM_LAGER', 'AUSGELIEHEN', 'GESPERRT')`,
    ),
    check(
      "machines_ownership_type_check",
      sql`${table.ownershipType} IN ('EIGENTUM', 'FLOTTE')`,
    ),
    check(
      "machines_checked_out_consistency",
      sql`(
        (${table.status} = 'AUSGELIEHEN' AND ${table.currentPersonId} IS NOT NULL AND ${table.currentCheckoutAt} IS NOT NULL)
        OR
        (${table.status} <> 'AUSGELIEHEN' AND ${table.currentPersonId} IS NULL AND ${table.currentCheckoutAt} IS NULL
          AND ${table.currentPlannedReturnDate} IS NULL AND ${table.currentProjectOrLocation} IS NULL)
      )`,
    ),
  ],
);
