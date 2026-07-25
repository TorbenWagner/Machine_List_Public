import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { machines } from "./machines";
import { people } from "./people";

export const transactionActionValues = [
  "CHECKOUT",
  "CHECKIN",
  "ADMIN_CHECKIN",
  "LOCK",
  "UNLOCK",
] as const;
export type TransactionAction = (typeof transactionActionValues)[number];

export const transactionSourceValues = ["QR_APP", "ADMIN"] as const;
export type TransactionSource = (typeof transactionSourceValues)[number];

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machines.id),
    action: text("action").notNull(),
    selectedPersonId: uuid("selected_person_id").references(() => people.id),
    previousHolderPersonId: uuid("previous_holder_person_id").references(
      () => people.id,
    ),
    plannedReturnDate: date("planned_return_date", { mode: "string" }),
    projectOrLocation: varchar("project_or_location", { length: 300 }),
    comment: text("comment"),
    reason: text("reason"),
    source: text("source").notNull(),
    adminUsername: varchar("admin_username", { length: 100 }),
    deviceId: varchar("device_id", { length: 100 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    browser: varchar("browser", { length: 100 }),
    operatingSystem: varchar("operating_system", { length: 100 }),
    deviceType: varchar("device_type", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_machine_id_idx").on(table.machineId),
    index("transactions_created_at_idx").on(table.createdAt),
    index("transactions_selected_person_id_idx").on(table.selectedPersonId),
    check(
      "transactions_action_check",
      sql`${table.action} IN ('CHECKOUT', 'CHECKIN', 'ADMIN_CHECKIN', 'LOCK', 'UNLOCK')`,
    ),
    check(
      "transactions_source_check",
      sql`${table.source} IN ('QR_APP', 'ADMIN')`,
    ),
  ],
);
