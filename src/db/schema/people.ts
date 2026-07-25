import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const personTypeValues = ["MITARBEITER", "SUBUNTERNEHMER"] as const;
export type PersonType = (typeof personTypeValues)[number];

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    personType: text("person_type").notNull(),
    company: varchar("company", { length: 200 }),
    employeeNumber: varchar("employee_number", { length: 50 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 200 }),
    comment: text("comment"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "people_person_type_check",
      sql`${table.personType} IN ('MITARBEITER', 'SUBUNTERNEHMER')`,
    ),
    check(
      "people_display_name_not_empty",
      sql`length(trim(${table.displayName})) > 0`,
    ),
  ],
);
