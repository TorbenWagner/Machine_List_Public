import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetAndSeed, db } from "./testDb";
import { checkoutMachine } from "@/services/transactions/transactionService";
import { machines, transactions } from "@/db/schema";
import { ServiceError } from "@/lib/serviceError";
import type { SeedResult } from "@/db/seed/seedDatabase";

let seed: SeedResult;

beforeEach(async () => {
  seed = await resetAndSeed();
});

describe("Entnahme (checkoutMachine)", () => {
  it("erfolgreiche Entnahme setzt Status, Nutzer und Zeitpunkt korrekt", async () => {
    const machine = seed.machines.inStorage[0];
    const person = seed.employees[0];

    const updated = await checkoutMachine({
      qrToken: machine.qrToken,
      personId: person.id,
      projectOrLocation: "Testbaustelle",
    });

    expect(updated.status).toBe("AUSGELIEHEN");
    expect(updated.currentPersonId).toBe(person.id);
    expect(updated.currentCheckoutAt).not.toBeNull();
    expect(updated.currentProjectOrLocation).toBe("Testbaustelle");

    const [dbRow] = await db.select().from(machines).where(eq(machines.id, machine.id));
    expect(dbRow.status).toBe("AUSGELIEHEN");
    expect(dbRow.currentPersonId).toBe(person.id);
  });

  it("erzeugt einen CHECKOUT-Historieneintrag", async () => {
    const machine = seed.machines.inStorage[0];
    const person = seed.employees[0];

    await checkoutMachine({ qrToken: machine.qrToken, personId: person.id });

    const rows = await db.select().from(transactions).where(eq(transactions.machineId, machine.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("CHECKOUT");
    expect(rows[0].selectedPersonId).toBe(person.id);
    expect(rows[0].source).toBe("QR_APP");
  });

  it("lehnt Entnahme einer gesperrten Maschine ab", async () => {
    const machine = seed.machines.locked;
    const person = seed.employees[0];

    await expect(
      checkoutMachine({ qrToken: machine.qrToken, personId: person.id }),
    ).rejects.toMatchObject({ code: "MACHINE_LOCKED" } satisfies Partial<ServiceError>);
  });

  it("lehnt Entnahme einer deaktivierten Maschine ab", async () => {
    const machine = seed.machines.inactive;
    const person = seed.employees[0];

    await expect(
      checkoutMachine({ qrToken: machine.qrToken, personId: person.id }),
    ).rejects.toMatchObject({ code: "MACHINE_INACTIVE" });
  });

  it("lehnt Entnahme einer bereits ausgeliehenen Maschine ab", async () => {
    const machine = seed.machines.checkedOut[0];
    const person = seed.employees[0];

    await expect(
      checkoutMachine({ qrToken: machine.qrToken, personId: person.id }),
    ).rejects.toMatchObject({ code: "MACHINE_ALREADY_CHECKED_OUT" });
  });

  it("verhindert doppelte Entnahme (zweiter sequentieller Versuch schlägt fehl)", async () => {
    const machine = seed.machines.inStorage[1];
    const personA = seed.employees[0];
    const personB = seed.employees[1];

    await checkoutMachine({ qrToken: machine.qrToken, personId: personA.id });

    await expect(
      checkoutMachine({ qrToken: machine.qrToken, personId: personB.id }),
    ).rejects.toMatchObject({ code: "MACHINE_ALREADY_CHECKED_OUT" });

    const [dbRow] = await db.select().from(machines).where(eq(machines.id, machine.id));
    expect(dbRow.currentPersonId).toBe(personA.id);
  });

  it("erlaubt bei paralleler Entnahme nur einen erfolgreichen Vorgang", async () => {
    const machine = seed.machines.inStorage[2];
    const personA = seed.employees[0];
    const personB = seed.employees[1];

    const results = await Promise.allSettled([
      checkoutMachine({ qrToken: machine.qrToken, personId: personA.id }),
      checkoutMachine({ qrToken: machine.qrToken, personId: personB.id }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rows = await db.select().from(transactions).where(eq(transactions.machineId, machine.id));
    expect(rows).toHaveLength(1);

    const [dbRow] = await db.select().from(machines).where(eq(machines.id, machine.id));
    expect(dbRow.status).toBe("AUSGELIEHEN");
    expect([personA.id, personB.id]).toContain(dbRow.currentPersonId);
  });

  it("lehnt inaktive Person ab", async () => {
    const machine = seed.machines.inStorage[0];

    await expect(
      checkoutMachine({ qrToken: machine.qrToken, personId: seed.inactivePerson.id }),
    ).rejects.toMatchObject({ code: "PERSON_INACTIVE" });
  });

  it("lehnt nicht existierende Person ab", async () => {
    const machine = seed.machines.inStorage[0];

    await expect(
      checkoutMachine({ qrToken: machine.qrToken, personId: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toMatchObject({ code: "PERSON_NOT_FOUND" });
  });

  it("lehnt geplante Rückgabe in der Vergangenheit ab", async () => {
    const machine = seed.machines.inStorage[0];
    const person = seed.employees[0];

    await expect(
      checkoutMachine({ qrToken: machine.qrToken, personId: person.id, plannedReturnDate: "2020-01-01" }),
    ).rejects.toMatchObject({ code: "PLANNED_RETURN_IN_PAST" });
  });

  it("lehnt Entnahme eines unbekannten QR-Tokens ab", async () => {
    await expect(
      checkoutMachine({ qrToken: "does-not-exist", personId: seed.employees[0].id }),
    ).rejects.toMatchObject({ code: "MACHINE_NOT_FOUND" });
  });
});
