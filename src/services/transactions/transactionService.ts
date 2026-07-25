import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  machines,
  people,
  transactions,
  type TransactionAction,
} from "@/db/schema";
import { isDateInPastBerlin } from "@/lib/validation/common";
import { ServiceError } from "@/lib/serviceError";
import { uiTexts } from "@/lib/ui-texts";
import { setAuditContext } from "@/services/audit/auditService";

export interface DeviceContext {
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  deviceType?: string | null;
}

interface CheckoutParams extends DeviceContext {
  qrToken: string;
  personId: string;
  projectOrLocation?: string;
  plannedReturnDate?: string;
  comment?: string;
}

interface CheckinParams extends DeviceContext {
  qrToken: string;
  personId: string;
  comment?: string;
}

interface AdminCheckinParams {
  machineId: string;
  reason: string;
  adminUsername: string;
}

/** Entnahme einer Maschine (oeffentliche QR-Anwendung). */
export async function checkoutMachine(params: CheckoutParams) {
  if (params.plannedReturnDate && isDateInPastBerlin(params.plannedReturnDate)) {
    throw new ServiceError(
      "PLANNED_RETURN_IN_PAST",
      uiTexts.errors.plannedReturnInPast,
      400,
    );
  }

  return db.transaction(async (tx) => {
    const [machine] = await tx
      .select()
      .from(machines)
      .where(eq(machines.qrToken, params.qrToken))
      .for("update");

    if (!machine) {
      throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
    }
    if (!machine.isActive) {
      throw new ServiceError("MACHINE_INACTIVE", uiTexts.errors.machineInactive, 409);
    }
    if (machine.status === "GESPERRT") {
      throw new ServiceError("MACHINE_LOCKED", uiTexts.errors.machineLocked, 409);
    }
    if (machine.status !== "IM_LAGER") {
      throw new ServiceError(
        "MACHINE_ALREADY_CHECKED_OUT",
        uiTexts.errors.machineAlreadyCheckedOut,
        409,
      );
    }

    const [person] = await tx.select().from(people).where(eq(people.id, params.personId));
    if (!person) {
      throw new ServiceError("PERSON_NOT_FOUND", uiTexts.errors.personNotFound, 400);
    }
    if (!person.isActive) {
      throw new ServiceError("PERSON_INACTIVE", uiTexts.errors.personInactive, 400);
    }

    const now = new Date();

    await tx.insert(transactions).values({
      machineId: machine.id,
      action: "CHECKOUT" satisfies TransactionAction,
      selectedPersonId: person.id,
      plannedReturnDate: params.plannedReturnDate ?? null,
      projectOrLocation: params.projectOrLocation ?? null,
      comment: params.comment ?? null,
      source: "QR_APP",
      deviceId: params.deviceId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      browser: params.browser ?? null,
      operatingSystem: params.operatingSystem ?? null,
      deviceType: params.deviceType ?? null,
    });

    const [updated] = await tx
      .update(machines)
      .set({
        status: "AUSGELIEHEN",
        currentPersonId: person.id,
        currentCheckoutAt: now,
        currentPlannedReturnDate: params.plannedReturnDate ?? null,
        currentProjectOrLocation: params.projectOrLocation ?? null,
      })
      .where(eq(machines.id, machine.id))
      .returning();

    return updated;
  });
}

/** Rueckgabe einer Maschine (oeffentliche QR-Anwendung). */
export async function checkinMachine(params: CheckinParams) {
  return db.transaction(async (tx) => {
    const [machine] = await tx
      .select()
      .from(machines)
      .where(eq(machines.qrToken, params.qrToken))
      .for("update");

    if (!machine) {
      throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
    }
    if (!machine.isActive) {
      throw new ServiceError("MACHINE_INACTIVE", uiTexts.errors.machineInactive, 409);
    }
    if (machine.status === "GESPERRT") {
      throw new ServiceError("MACHINE_LOCKED", uiTexts.errors.machineLocked, 409);
    }
    if (machine.status !== "AUSGELIEHEN") {
      throw new ServiceError(
        "MACHINE_NOT_CHECKED_OUT",
        uiTexts.errors.machineNotCheckedOut,
        409,
      );
    }

    const [person] = await tx.select().from(people).where(eq(people.id, params.personId));
    if (!person) {
      throw new ServiceError("PERSON_NOT_FOUND", uiTexts.errors.personNotFound, 400);
    }
    if (!person.isActive) {
      throw new ServiceError("PERSON_INACTIVE", uiTexts.errors.personInactive, 400);
    }

    const previousHolderPersonId = machine.currentPersonId;

    await tx.insert(transactions).values({
      machineId: machine.id,
      action: "CHECKIN" satisfies TransactionAction,
      selectedPersonId: person.id,
      previousHolderPersonId,
      comment: params.comment ?? null,
      source: "QR_APP",
      deviceId: params.deviceId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      browser: params.browser ?? null,
      operatingSystem: params.operatingSystem ?? null,
      deviceType: params.deviceType ?? null,
    });

    const [updated] = await tx
      .update(machines)
      .set({
        status: "IM_LAGER",
        currentPersonId: null,
        currentCheckoutAt: null,
        currentPlannedReturnDate: null,
        currentProjectOrLocation: null,
      })
      .where(eq(machines.id, machine.id))
      .returning();

    return updated;
  });
}

/** Administrative Rueckgabe einer ausgeliehenen Maschine. */
export async function adminCheckinMachine(params: AdminCheckinParams) {
  return db.transaction(async (tx) => {
    const [machine] = await tx
      .select()
      .from(machines)
      .where(eq(machines.id, params.machineId))
      .for("update");

    if (!machine) {
      throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
    }
    if (machine.status !== "AUSGELIEHEN") {
      throw new ServiceError(
        "MACHINE_NOT_CHECKED_OUT",
        uiTexts.errors.machineNotCheckedOut,
        409,
      );
    }

    const previousHolderPersonId = machine.currentPersonId;

    await tx.insert(transactions).values({
      machineId: machine.id,
      action: "ADMIN_CHECKIN" satisfies TransactionAction,
      previousHolderPersonId,
      reason: params.reason,
      source: "ADMIN",
      adminUsername: params.adminUsername,
    });

    await setAuditContext(tx, params.adminUsername);

    const [updated] = await tx
      .update(machines)
      .set({
        status: "IM_LAGER",
        currentPersonId: null,
        currentCheckoutAt: null,
        currentPlannedReturnDate: null,
        currentProjectOrLocation: null,
      })
      .where(eq(machines.id, machine.id))
      .returning();

    return updated;
  });
}

interface LockParams {
  machineId: string;
  informationText?: string;
  adminUsername: string;
}

export async function lockMachine(params: LockParams) {
  return db.transaction(async (tx) => {
    const [machine] = await tx
      .select()
      .from(machines)
      .where(eq(machines.id, params.machineId))
      .for("update");

    if (!machine) {
      throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
    }
    if (machine.status !== "IM_LAGER") {
      throw new ServiceError(
        "MACHINE_CANNOT_LOCK",
        uiTexts.errors.machineCannotLock,
        409,
      );
    }

    await tx.insert(transactions).values({
      machineId: machine.id,
      action: "LOCK" satisfies TransactionAction,
      comment: params.informationText ?? null,
      source: "ADMIN",
      adminUsername: params.adminUsername,
    });

    await setAuditContext(tx, params.adminUsername);

    const [updated] = await tx
      .update(machines)
      .set({
        status: "GESPERRT",
        ...(params.informationText !== undefined
          ? { informationText: params.informationText }
          : {}),
      })
      .where(eq(machines.id, machine.id))
      .returning();

    return updated;
  });
}

interface UnlockParams {
  machineId: string;
  adminUsername: string;
}

export async function unlockMachine(params: UnlockParams) {
  return db.transaction(async (tx) => {
    const [machine] = await tx
      .select()
      .from(machines)
      .where(eq(machines.id, params.machineId))
      .for("update");

    if (!machine) {
      throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
    }
    if (machine.status !== "GESPERRT") {
      throw new ServiceError(
        "MACHINE_CANNOT_UNLOCK",
        uiTexts.errors.machineCannotUnlock,
        409,
      );
    }

    await tx.insert(transactions).values({
      machineId: machine.id,
      action: "UNLOCK" satisfies TransactionAction,
      source: "ADMIN",
      adminUsername: params.adminUsername,
    });

    await setAuditContext(tx, params.adminUsername);

    const [updated] = await tx
      .update(machines)
      .set({ status: "IM_LAGER" })
      .where(eq(machines.id, machine.id))
      .returning();

    return updated;
  });
}

export interface HistoryFilters {
  machineId?: string;
  personId?: string;
  action?: TransactionAction;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export async function listHistory(filters: HistoryFilters = {}) {
  const conditions = [];
  if (filters.machineId) conditions.push(eq(transactions.machineId, filters.machineId));
  if (filters.personId) {
    conditions.push(
      sql`(${transactions.selectedPersonId} = ${filters.personId} OR ${transactions.previousHolderPersonId} = ${filters.personId})`,
    );
  }
  if (filters.action) conditions.push(eq(transactions.action, filters.action));
  if (filters.dateFrom) conditions.push(gte(transactions.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) {
    const endOfDay = new Date(filters.dateTo);
    endOfDay.setUTCHours(23, 59, 59, 999);
    conditions.push(lte(transactions.createdAt, endOfDay));
  }

  const rows = await db
    .select({
      id: transactions.id,
      machineId: transactions.machineId,
      machineName: machines.name,
      action: transactions.action,
      selectedPersonId: transactions.selectedPersonId,
      plannedReturnDate: transactions.plannedReturnDate,
      projectOrLocation: transactions.projectOrLocation,
      comment: transactions.comment,
      reason: transactions.reason,
      source: transactions.source,
      adminUsername: transactions.adminUsername,
      previousHolderPersonId: transactions.previousHolderPersonId,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .innerJoin(machines, eq(transactions.machineId, machines.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transactions.createdAt))
    .limit(filters.limit ?? 500);

  const personIds = new Set<string>();
  rows.forEach((row) => {
    if (row.selectedPersonId) personIds.add(row.selectedPersonId);
    if (row.previousHolderPersonId) personIds.add(row.previousHolderPersonId);
  });

  const peopleRows = personIds.size
    ? await db
        .select({ id: people.id, displayName: people.displayName })
        .from(people)
        .where(inArray(people.id, Array.from(personIds)))
    : [];
  const peopleMap = new Map(peopleRows.map((p) => [p.id, p.displayName]));

  return rows.map((row) => ({
    ...row,
    selectedPersonName: row.selectedPersonId ? peopleMap.get(row.selectedPersonId) ?? null : null,
    previousHolderName: row.previousHolderPersonId
      ? peopleMap.get(row.previousHolderPersonId) ?? null
      : null,
  }));
}
