import { beforeEach, describe, expect, it } from "vitest";
import { resetAndSeed } from "./testDb";
import {
  createPerson,
  listActivePeoplePublic,
  setPersonActive,
  updatePerson,
} from "@/services/people/peopleService";
import type { SeedResult } from "@/db/seed/seedDatabase";
import type { PersonInput } from "@/lib/validation/people";

let seed: SeedResult;

beforeEach(async () => {
  seed = await resetAndSeed();
});

const basePersonInput: PersonInput = {
  displayName: "Neue Testperson",
  personType: "MITARBEITER",
  company: undefined,
  employeeNumber: undefined,
  phone: undefined,
  email: undefined,
  comment: undefined,
};

describe("Personenverwaltung", () => {
  it("legt eine neue Person an", async () => {
    const created = await createPerson(basePersonInput, "admin");
    expect(created?.displayName).toBe("Neue Testperson");
    expect(created?.isActive).toBe(true);
  });

  it("deaktivierte Person erscheint nicht mehr in der öffentlichen Liste", async () => {
    const before = await listActivePeoplePublic();
    expect(before.map((p) => p.id)).toContain(seed.employees[0].id);

    await setPersonActive(seed.employees[0].id, false, "admin");

    const after = await listActivePeoplePublic();
    expect(after.map((p) => p.id)).not.toContain(seed.employees[0].id);
  });

  it("reaktivierte Person erscheint wieder in der öffentlichen Liste", async () => {
    await setPersonActive(seed.inactivePerson.id, true, "admin");
    const after = await listActivePeoplePublic();
    expect(after.map((p) => p.id)).toContain(seed.inactivePerson.id);
  });

  it("Personen werden nicht physisch gelöscht - nur deaktiviert (Stammdaten bleiben erhalten)", async () => {
    const updated = await setPersonActive(seed.employees[0].id, false, "admin");
    expect(updated.id).toBe(seed.employees[0].id);
    expect(updated.isActive).toBe(false);
  });

  it("aktualisiert Stammdaten einer Person", async () => {
    const updated = await updatePerson(
      seed.employees[0].id,
      { ...basePersonInput, displayName: "Geänderter Name" },
      "admin",
    );
    expect(updated.displayName).toBe("Geänderter Name");
  });
});
