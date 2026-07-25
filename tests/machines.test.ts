import { beforeEach, describe, expect, it } from "vitest";
import { resetAndSeed } from "./testDb";
import { createMachine } from "@/services/machines/machineService";
import type { SeedResult } from "@/db/seed/seedDatabase";
import type { MachineInput } from "@/lib/validation/machine";

let seed: SeedResult;

beforeEach(async () => {
  seed = await resetAndSeed();
});

function baseInput(overrides: Partial<MachineInput> = {}): MachineInput {
  return {
    name: "Neue Testmaschine",
    manufacturer: "TestHersteller",
    modelName: "TM-1",
    serialNumber: "TM-0001",
    storageLocation: "Testlager",
    ownershipType: "EIGENTUM",
    purchaseDate: "2024-01-01",
    hiltiScanCode: undefined,
    alternativeCode: undefined,
    description: undefined,
    responsiblePersonId: undefined,
    informationText: undefined,
    ...overrides,
  };
}

describe("Maschinenverwaltung - Eindeutigkeit", () => {
  it("lehnt doppelte Kombination aus Hersteller und Seriennummer ab", async () => {
    await expect(
      createMachine(
        baseInput({ manufacturer: "Makita", serialNumber: "MKT-0003", name: "Duplikat" }),
        "admin",
      ),
    ).rejects.toMatchObject({ code: "DUPLICATE_SERIAL_NUMBER" });
  });

  it("erzeugt eine Maschine mit automatisch generiertem, eindeutigem QR-Token", async () => {
    const created = await createMachine(baseInput(), "admin");
    expect(created?.qrToken).toBeTruthy();
    expect(created?.qrToken.length).toBeGreaterThan(20);
  });
});

describe("Maschinenverwaltung - verantwortliche Person", () => {
  it("lehnt eine inaktive Person als verantwortlichen Mitarbeiter ab", async () => {
    await expect(
      createMachine(baseInput({ responsiblePersonId: seed.inactivePerson.id }), "admin"),
    ).rejects.toMatchObject({ code: "RESPONSIBLE_PERSON_INVALID" });
  });

  it("lehnt einen Subunternehmer als verantwortlichen Mitarbeiter ab", async () => {
    await expect(
      createMachine(baseInput({ responsiblePersonId: seed.subcontractors[0].id }), "admin"),
    ).rejects.toMatchObject({ code: "RESPONSIBLE_PERSON_INVALID" });
  });

  it("akzeptiert einen aktiven Mitarbeiter als verantwortlichen Mitarbeiter", async () => {
    const created = await createMachine(
      baseInput({ responsiblePersonId: seed.employees[0].id }),
      "admin",
    );
    expect(created?.responsiblePersonId).toBe(seed.employees[0].id);
  });
});
