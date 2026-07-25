import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetAndSeed, db } from "./testDb";
import { checkinMachine } from "@/services/transactions/transactionService";
import { machines, transactions } from "@/db/schema";
import type { SeedResult } from "@/db/seed/seedDatabase";

let seed: SeedResult;

beforeEach(async () => {
  seed = await resetAndSeed();
});

describe("Rückgabe (checkinMachine)", () => {
  it("erfolgreiche Rückgabe durch die entnehmende Person", async () => {
    const machine = seed.machines.checkedOut[0];

    const updated = await checkinMachine({
      qrToken: machine.qrToken,
      personId: machine.currentPersonId,
    });

    expect(updated.status).toBe("IM_LAGER");
    expect(updated.currentPersonId).toBeNull();
  });

  it("Rückgabe durch eine andere aktive Person ist möglich", async () => {
    const machine = seed.machines.checkedOut[0];
    const otherPerson = seed.employees.find((e) => e.id !== machine.currentPersonId)!;

    const updated = await checkinMachine({ qrToken: machine.qrToken, personId: otherPerson.id });

    expect(updated.status).toBe("IM_LAGER");
  });

  it("entfernt alle aktuellen Ausleihfelder vollständig", async () => {
    const machine = seed.machines.checkedOut[0];

    await checkinMachine({ qrToken: machine.qrToken, personId: machine.currentPersonId });

    const [dbRow] = await db.select().from(machines).where(eq(machines.id, machine.id));
    expect(dbRow.currentPersonId).toBeNull();
    expect(dbRow.currentCheckoutAt).toBeNull();
    expect(dbRow.currentPlannedReturnDate).toBeNull();
    expect(dbRow.currentProjectOrLocation).toBeNull();
  });

  it("speichert den vorherigen Nutzer im Historieneintrag", async () => {
    const machine = seed.machines.checkedOut[0];
    const returningPerson = seed.employees.find((e) => e.id !== machine.currentPersonId)!;

    await checkinMachine({ qrToken: machine.qrToken, personId: returningPerson.id });

    const entries = await db.select().from(transactions).where(eq(transactions.machineId, machine.id));
    const checkin = entries.find((e) => e.action === "CHECKIN")!;

    expect(checkin).toBeDefined();
    expect(checkin.selectedPersonId).toBe(returningPerson.id);
    expect(checkin.previousHolderPersonId).toBe(machine.currentPersonId);
  });

  it("lehnt Rückgabe einer eingelagerten Maschine ab", async () => {
    const machine = seed.machines.inStorage[0];

    await expect(
      checkinMachine({ qrToken: machine.qrToken, personId: seed.employees[0].id }),
    ).rejects.toMatchObject({ code: "MACHINE_NOT_CHECKED_OUT" });
  });

  it("lehnt Rückgabe einer gesperrten Maschine ab", async () => {
    const machine = seed.machines.locked;

    await expect(
      checkinMachine({ qrToken: machine.qrToken, personId: seed.employees[0].id }),
    ).rejects.toMatchObject({ code: "MACHINE_LOCKED" });
  });

  it("lehnt inaktive zurückgebende Person ab", async () => {
    const machine = seed.machines.checkedOut[0];

    await expect(
      checkinMachine({ qrToken: machine.qrToken, personId: seed.inactivePerson.id }),
    ).rejects.toMatchObject({ code: "PERSON_INACTIVE" });
  });
});
