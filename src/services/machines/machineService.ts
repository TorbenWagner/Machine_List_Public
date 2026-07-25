import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  machines,
  people,
  type MachineStatus,
  type OwnershipType,
} from "@/db/schema";
import { ServiceError } from "@/lib/serviceError";
import { uiTexts } from "@/lib/ui-texts";
import { generateQrToken } from "@/lib/qrToken";
import type { MachineInput } from "@/lib/validation/machine";
import { setAuditContext } from "@/services/audit/auditService";

interface PgErrorLike {
  code?: string;
  constraint_name?: string;
  cause?: unknown;
}

/**
 * drizzle-orm bettet den eigentlichen Postgres-Fehler (mit code/
 * constraint_name) in error.cause ein und wirft selbst einen
 * DrizzleQueryError ohne diese Felder. Deshalb muss hier zusaetzlich
 * error.cause geprueft werden.
 */
function extractPgError(error: unknown): PgErrorLike {
  const candidate = error as PgErrorLike;
  if (candidate?.code) return candidate;
  if (candidate?.cause) return extractPgError(candidate.cause);
  return {};
}

function mapUniqueConstraintError(error: unknown): never {
  const pgError = extractPgError(error);
  if (pgError?.code === "23505") {
    if (pgError.constraint_name === "machines_manufacturer_serial_unique") {
      throw new ServiceError(
        "DUPLICATE_SERIAL_NUMBER",
        uiTexts.errors.duplicateSerialNumber,
        409,
      );
    }
    if (pgError.constraint_name === "machines_hilti_scan_code_unique") {
      throw new ServiceError(
        "DUPLICATE_HILTI_SCAN_CODE",
        uiTexts.errors.duplicateHiltiScanCode,
        409,
      );
    }
    if (pgError.constraint_name === "machines_alternative_code_unique") {
      throw new ServiceError(
        "DUPLICATE_ALTERNATIVE_CODE",
        uiTexts.errors.duplicateAlternativeCode,
        409,
      );
    }
  }
  throw error;
}

async function assertResponsiblePersonValid(personId: string | undefined) {
  if (!personId) return;
  const [person] = await db.select().from(people).where(eq(people.id, personId));
  if (!person || !person.isActive || person.personType !== "MITARBEITER") {
    throw new ServiceError(
      "RESPONSIBLE_PERSON_INVALID",
      uiTexts.errors.personNotEmployeeOrInactive,
      400,
    );
  }
}

export interface MachineListFilters {
  search?: string;
  status?: MachineStatus;
  ownershipType?: OwnershipType;
  activeFilter?: "all" | "active" | "inactive";
}

export async function listMachines(filters: MachineListFilters = {}) {
  const conditions = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(machines.name, term),
        ilike(machines.manufacturer, term),
        ilike(machines.modelName, term),
        ilike(machines.serialNumber, term),
        ilike(machines.hiltiScanCode, term),
        ilike(machines.alternativeCode, term),
      ),
    );
  }
  if (filters.status) conditions.push(eq(machines.status, filters.status));
  if (filters.ownershipType) conditions.push(eq(machines.ownershipType, filters.ownershipType));
  if (filters.activeFilter === "active") conditions.push(eq(machines.isActive, true));
  if (filters.activeFilter === "inactive") conditions.push(eq(machines.isActive, false));

  const rows = await db
    .select({
      machine: machines,
      currentPersonName: people.displayName,
    })
    .from(machines)
    .leftJoin(people, eq(machines.currentPersonId, people.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(machines.name));

  return rows.map((row) => ({ ...row.machine, currentPersonName: row.currentPersonName }));
}

export async function getMachineById(id: string) {
  const [machine] = await db.select().from(machines).where(eq(machines.id, id));
  if (!machine) {
    throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
  }
  return machine;
}

export interface PublicMachineView {
  name: string;
  manufacturer: string;
  modelName: string;
  description: string | null;
  status: MachineStatus;
  storageLocation: string | null;
  informationText: string | null;
  currentUserName: string | null;
  currentCheckoutAt: Date | null;
  currentPlannedReturnDate: string | null;
  currentProjectOrLocation: string | null;
  isActive: boolean;
}

/**
 * Liefert ausschliesslich die oeffentlich zulaessigen Felder einer
 * Maschine anhand des QR-Tokens. Interne Felder (Seriennummer, Codes,
 * Kaufdatum, verantwortliche Person, IDs) werden hier bewusst nicht
 * ausgewaehlt, damit sie nicht versehentlich nach aussen gelangen.
 */
export async function getPublicMachineView(qrToken: string): Promise<PublicMachineView> {
  const [row] = await db
    .select({
      name: machines.name,
      manufacturer: machines.manufacturer,
      modelName: machines.modelName,
      description: machines.description,
      status: machines.status,
      storageLocation: machines.storageLocation,
      informationText: machines.informationText,
      currentCheckoutAt: machines.currentCheckoutAt,
      currentPlannedReturnDate: machines.currentPlannedReturnDate,
      currentProjectOrLocation: machines.currentProjectOrLocation,
      isActive: machines.isActive,
      currentUserName: people.displayName,
    })
    .from(machines)
    .leftJoin(people, eq(machines.currentPersonId, people.id))
    .where(eq(machines.qrToken, qrToken));

  if (!row) {
    throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
  }

  return {
    ...row,
    status: row.status as MachineStatus,
    storageLocation: row.status === "IM_LAGER" ? row.storageLocation : null,
    currentUserName: row.status === "AUSGELIEHEN" ? row.currentUserName : null,
    currentCheckoutAt: row.status === "AUSGELIEHEN" ? row.currentCheckoutAt : null,
    currentPlannedReturnDate:
      row.status === "AUSGELIEHEN" ? row.currentPlannedReturnDate : null,
    currentProjectOrLocation:
      row.status === "AUSGELIEHEN" ? row.currentProjectOrLocation : null,
  };
}

export async function createMachine(input: MachineInput, adminUsername: string) {
  await assertResponsiblePersonValid(input.responsiblePersonId);

  try {
    return await db.transaction(async (tx) => {
      await setAuditContext(tx, adminUsername);
      const [created] = await tx
        .insert(machines)
        .values({
          qrToken: generateQrToken(),
          name: input.name,
          manufacturer: input.manufacturer,
          modelName: input.modelName,
          serialNumber: input.serialNumber,
          storageLocation: input.storageLocation,
          ownershipType: input.ownershipType,
          purchaseDate: input.purchaseDate,
          hiltiScanCode: input.hiltiScanCode ?? null,
          alternativeCode: input.alternativeCode ?? null,
          description: input.description ?? null,
          responsiblePersonId: input.responsiblePersonId ?? null,
          informationText: input.informationText ?? null,
        })
        .returning();
      return created;
    });
  } catch (error) {
    mapUniqueConstraintError(error);
  }
}

export async function updateMachine(id: string, input: MachineInput, adminUsername: string) {
  await assertResponsiblePersonValid(input.responsiblePersonId);

  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(machines).where(eq(machines.id, id)).for("update");
      if (!existing) {
        throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
      }

      await setAuditContext(tx, adminUsername);
      const [updated] = await tx
        .update(machines)
        .set({
          name: input.name,
          manufacturer: input.manufacturer,
          modelName: input.modelName,
          serialNumber: input.serialNumber,
          storageLocation: input.storageLocation,
          ownershipType: input.ownershipType,
          purchaseDate: input.purchaseDate,
          hiltiScanCode: input.hiltiScanCode ?? null,
          alternativeCode: input.alternativeCode ?? null,
          description: input.description ?? null,
          responsiblePersonId: input.responsiblePersonId ?? null,
          informationText: input.informationText ?? null,
        })
        .where(eq(machines.id, id))
        .returning();
      return updated;
    });
  } catch (error) {
    mapUniqueConstraintError(error);
  }
}

export async function setMachineActive(id: string, isActive: boolean, adminUsername: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(machines).where(eq(machines.id, id)).for("update");
    if (!existing) {
      throw new ServiceError("MACHINE_NOT_FOUND", uiTexts.errors.machineNotFound, 404);
    }
    if (!isActive && existing.status === "AUSGELIEHEN") {
      throw new ServiceError(
        "MACHINE_CANNOT_DEACTIVATE_CHECKED_OUT",
        uiTexts.errors.machineCannotDeactivateCheckedOut,
        409,
      );
    }

    await setAuditContext(tx, adminUsername);
    const [updated] = await tx
      .update(machines)
      .set({ isActive })
      .where(eq(machines.id, id))
      .returning();
    return updated;
  });
}

export async function listMachinesForQrExport() {
  return db
    .select({ id: machines.id, name: machines.name, qrToken: machines.qrToken })
    .from(machines)
    .orderBy(asc(machines.name));
}
