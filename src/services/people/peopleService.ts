import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { people, type PersonType } from "@/db/schema";
import { ServiceError } from "@/lib/serviceError";
import { uiTexts } from "@/lib/ui-texts";
import { setAuditContext } from "@/services/audit/auditService";
import type { PersonInput } from "@/lib/validation/people";

export interface PeopleListFilters {
  search?: string;
  activeFilter?: "all" | "active" | "inactive";
}

export async function listPeople(filters: PeopleListFilters = {}) {
  const conditions = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(people.displayName, term), ilike(people.company, term)),
    );
  }

  if (filters.activeFilter === "active") {
    conditions.push(eq(people.isActive, true));
  } else if (filters.activeFilter === "inactive") {
    conditions.push(eq(people.isActive, false));
  }

  return db
    .select()
    .from(people)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(people.displayName));
}

/** Nur aktive Personen mit minimalen Feldern - fuer die oeffentliche Auswahl. */
export async function listActivePeoplePublic() {
  const rows = await db
    .select({
      id: people.id,
      displayName: people.displayName,
      company: people.company,
      personType: people.personType,
    })
    .from(people)
    .where(eq(people.isActive, true))
    .orderBy(asc(people.displayName));

  return rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    company: row.company,
    personType: row.personType as PersonType,
  }));
}

/** Aktive Mitarbeiter fuer die Auswahl als verantwortliche Person. */
export async function listActiveEmployees() {
  return db
    .select({ id: people.id, displayName: people.displayName })
    .from(people)
    .where(and(eq(people.isActive, true), eq(people.personType, "MITARBEITER")))
    .orderBy(asc(people.displayName));
}

export async function getPersonById(id: string) {
  const [person] = await db.select().from(people).where(eq(people.id, id));
  if (!person) {
    throw new ServiceError("PERSON_NOT_FOUND", uiTexts.errors.personNotFound, 404);
  }
  return person;
}

export async function createPerson(input: PersonInput, adminUsername: string) {
  return db.transaction(async (tx) => {
    await setAuditContext(tx, adminUsername);
    const [created] = await tx
      .insert(people)
      .values({
        displayName: input.displayName,
        personType: input.personType,
        company: input.company ?? null,
        employeeNumber: input.employeeNumber ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        comment: input.comment ?? null,
      })
      .returning();
    return created;
  });
}

export async function updatePerson(id: string, input: PersonInput, adminUsername: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(people).where(eq(people.id, id)).for("update");
    if (!existing) {
      throw new ServiceError("PERSON_NOT_FOUND", uiTexts.errors.personNotFound, 404);
    }

    await setAuditContext(tx, adminUsername);
    const [updated] = await tx
      .update(people)
      .set({
        displayName: input.displayName,
        personType: input.personType,
        company: input.company ?? null,
        employeeNumber: input.employeeNumber ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        comment: input.comment ?? null,
      })
      .where(eq(people.id, id))
      .returning();
    return updated;
  });
}

export async function setPersonActive(id: string, isActive: boolean, adminUsername: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(people).where(eq(people.id, id)).for("update");
    if (!existing) {
      throw new ServiceError("PERSON_NOT_FOUND", uiTexts.errors.personNotFound, 404);
    }

    await setAuditContext(tx, adminUsername);
    const [updated] = await tx
      .update(people)
      .set({ isActive })
      .where(eq(people.id, id))
      .returning();
    return updated;
  });
}
