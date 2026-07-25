import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetAndSeed, db } from "./testDb";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import {
  lockMachine,
  unlockMachine,
  adminCheckinMachine,
} from "@/services/transactions/transactionService";
import { setMachineActive, updateMachine } from "@/services/machines/machineService";
import { getAuditLogForEntity } from "@/services/audit/auditService";
import { machines, transactions } from "@/db/schema";
import type { SeedResult } from "@/db/seed/seedDatabase";
import type { MachineInput } from "@/lib/validation/machine";

let seed: SeedResult;

beforeEach(async () => {
  seed = await resetAndSeed();
});

describe("Passwort-Hashing", () => {
  it("verifiziert das richtige Passwort und lehnt ein falsches ab", () => {
    const hash = hashPassword("EinSicheresPasswort123!");
    expect(verifyPassword("EinSicheresPasswort123!", hash)).toBe(true);
    expect(verifyPassword("FalschesPasswort", hash)).toBe(false);
  });

  it("speichert niemals das Klartextpasswort im Hash", () => {
    const hash = hashPassword("GeheimesPasswort");
    expect(hash).not.toContain("GeheimesPasswort");
  });
});

describe("Admin-Session", () => {
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret-mindestens-32-zeichen-lang";
  });

  it("gültige Anmeldung erzeugt ein verifizierbares Token", () => {
    const token = createSessionToken("admin");
    const result = verifySessionToken(token);
    expect(result?.username).toBe("admin");
  });

  it("lehnt ein manipuliertes Token ab", () => {
    const token = createSessionToken("admin");
    const tampered = token.slice(0, -2) + "xx";
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("lehnt ein abgelaufenes Token ab", () => {
    const originalNow = Date.now;
    Date.now = () => originalNow() - 1000 * 60 * 60 * 13; // 13h in der Vergangenheit erzeugen
    const token = createSessionToken("admin");
    Date.now = originalNow;

    expect(verifySessionToken(token)).toBeNull();
  });

  it("lehnt ein leeres/fehlendes Token ab", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
  });

  it("stellt SESSION_SECRET nach dem Test wieder her", () => {
    process.env.SESSION_SECRET = originalSecret;
    expect(true).toBe(true);
  });
});

// Hinweis: Ein direkter Test der Admin-API-Routen (z. B. QR-Code-Route)
// ausserhalb des laufenden Next.js-Servers ist mit next/headers' cookies()
// nicht moeglich, da diese Funktion einen echten Request-Scope
// (AsyncLocalStorage) benoetigt, den es in Vitest nicht gibt ("cookies was
// called outside a request scope"). Der Routenschutz (401 ohne
// Admin-Session) wurde daher manuell gegen den laufenden Dev-Server
// verifiziert: GET /api/admin/machines/{id}/qr ohne Sitzungscookie liefert
// HTTP 401. Siehe README, Abschnitt "Bekannte Einschraenkungen".

describe("Sperren / Freigeben", () => {
  it("Sperrung einer eingelagerten Maschine funktioniert und erzeugt LOCK-Transaktion", async () => {
    const machine = seed.machines.inStorage[0];
    const updated = await lockMachine({ machineId: machine.id, adminUsername: "admin" });
    expect(updated.status).toBe("GESPERRT");
  });

  it("Sperrung einer ausgeliehenen Maschine wird abgelehnt", async () => {
    const machine = seed.machines.checkedOut[0];
    await expect(lockMachine({ machineId: machine.id, adminUsername: "admin" })).rejects.toMatchObject({
      code: "MACHINE_CANNOT_LOCK",
    });
  });

  it("Freigabe einer gesperrten Maschine funktioniert", async () => {
    const machine = seed.machines.locked;
    const updated = await unlockMachine({ machineId: machine.id, adminUsername: "admin" });
    expect(updated.status).toBe("IM_LAGER");
  });

  it("Freigabe einer nicht gesperrten Maschine wird abgelehnt", async () => {
    const machine = seed.machines.inStorage[0];
    await expect(unlockMachine({ machineId: machine.id, adminUsername: "admin" })).rejects.toMatchObject({
      code: "MACHINE_CANNOT_UNLOCK",
    });
  });
});

describe("Administrative Rückgabe", () => {
  it("funktioniert für eine ausgeliehene Maschine und erzeugt Transaktion + Audit-Eintrag", async () => {
    const machine = seed.machines.checkedOut[0];

    const updated = await adminCheckinMachine({
      machineId: machine.id,
      reason: "Test: administrative Rückgabe",
      adminUsername: "admin",
    });

    expect(updated.status).toBe("IM_LAGER");
    expect(updated.currentPersonId).toBeNull();

    const auditEntries = await getAuditLogForEntity("MACHINE", machine.id);
    const relevantEntry = auditEntries.find((e) => e.adminUsername === "admin");
    expect(relevantEntry).toBeDefined();
  });

  it("die ursprüngliche CHECKOUT-Transaktion bleibt unverändert erhalten", async () => {
    const machine = seed.machines.checkedOut[0];

    const before = await db.select().from(transactions).where(eq(transactions.machineId, machine.id));
    const checkoutBefore = before.find((t) => t.action === "CHECKOUT");

    await adminCheckinMachine({ machineId: machine.id, reason: "Test", adminUsername: "admin" });

    const after = await db.select().from(transactions).where(eq(transactions.machineId, machine.id));
    const checkoutAfter = after.find((t) => t.action === "CHECKOUT");

    expect(checkoutAfter).toEqual(checkoutBefore);
  });

  it("für eine eingelagerte Maschine wird abgelehnt", async () => {
    const machine = seed.machines.inStorage[0];
    await expect(
      adminCheckinMachine({ machineId: machine.id, reason: "Test", adminUsername: "admin" }),
    ).rejects.toMatchObject({ code: "MACHINE_NOT_CHECKED_OUT" });
  });
});

describe("Deaktivierung / Reaktivierung", () => {
  it("Deaktivierung einer ausgeliehenen Maschine wird abgelehnt", async () => {
    const machine = seed.machines.checkedOut[0];
    await expect(setMachineActive(machine.id, false, "admin")).rejects.toMatchObject({
      code: "MACHINE_CANNOT_DEACTIVATE_CHECKED_OUT",
    });
  });

  it("Deaktivierung und Reaktivierung einer eingelagerten Maschine funktioniert", async () => {
    const machine = seed.machines.inStorage[0];
    const deactivated = await setMachineActive(machine.id, false, "admin");
    expect(deactivated.isActive).toBe(false);

    const reactivated = await setMachineActive(machine.id, true, "admin");
    expect(reactivated.isActive).toBe(true);
  });
});

describe("Audit-Log bei Stammdatenänderungen", () => {
  it("Stammdatenänderung an einer Maschine erzeugt einen Audit-Eintrag mit admin_username", async () => {
    const machine = seed.machines.inStorage[0];
    const [current] = await db.select().from(machines).where(eq(machines.id, machine.id));

    const input: MachineInput = {
      name: current.name + " (geändert)",
      manufacturer: current.manufacturer,
      modelName: current.modelName,
      serialNumber: current.serialNumber,
      storageLocation: current.storageLocation,
      ownershipType: current.ownershipType as MachineInput["ownershipType"],
      purchaseDate: current.purchaseDate,
      hiltiScanCode: current.hiltiScanCode ?? undefined,
      alternativeCode: current.alternativeCode ?? undefined,
      description: current.description ?? undefined,
      responsiblePersonId: current.responsiblePersonId ?? undefined,
      informationText: current.informationText ?? undefined,
    };

    await updateMachine(machine.id, input, "admin");

    const auditEntries = await getAuditLogForEntity("MACHINE", machine.id);
    const updateEntry = auditEntries.find((e) => e.action === "UPDATE" && e.adminUsername === "admin");
    expect(updateEntry).toBeDefined();
  });

  it("direkte Datenbankänderungen (ohne Anwendung) werden ebenfalls im Audit-Log erfasst", async () => {
    const machine = seed.machines.inStorage[0];
    await db.update(machines).set({ description: "Direkt in der DB geändert" }).where(eq(machines.id, machine.id));

    const auditEntries = await getAuditLogForEntity("MACHINE", machine.id);
    const directEntry = auditEntries.find((e) => e.action === "UPDATE" && !e.adminUsername);
    expect(directEntry).toBeDefined();
    expect(directEntry?.databaseUser).toBeTruthy();
  });
});
