import { describe, expect, it } from "vitest";
import { machineInputSchema } from "@/lib/validation/machine";
import { personInputSchema } from "@/lib/validation/people";
import { publicCheckoutSchema } from "@/lib/validation/transaction";

describe("Serverseitige Validierung (manipulierte Formulareingaben)", () => {
  it("lehnt ein ungültiges Eigentumstyp-Feld ab", () => {
    const result = machineInputSchema.safeParse({
      name: "X",
      manufacturer: "X",
      modelName: "X",
      serialNumber: "X",
      storageLocation: "X",
      ownershipType: "GESTOHLEN",
      purchaseDate: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("lehnt zu lange Freitextfelder ab (Maximallänge)", () => {
    const result = machineInputSchema.safeParse({
      name: "A".repeat(500),
      manufacturer: "X",
      modelName: "X",
      serialNumber: "X",
      storageLocation: "X",
      ownershipType: "EIGENTUM",
      purchaseDate: "2024-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("lehnt ein ungültiges Datumsformat ab", () => {
    const result = machineInputSchema.safeParse({
      name: "X",
      manufacturer: "X",
      modelName: "X",
      serialNumber: "X",
      storageLocation: "X",
      ownershipType: "EIGENTUM",
      purchaseDate: "01.01.2024",
    });
    expect(result.success).toBe(false);
  });

  it("lehnt einen ungültigen Personentyp ab (manipuliertes <select>)", () => {
    const result = personInputSchema.safeParse({
      displayName: "Test",
      personType: "ADMINISTRATOR",
    });
    expect(result.success).toBe(false);
  });

  it("lehnt eine leere Personenauswahl bei der Entnahme ab", () => {
    const result = publicCheckoutSchema.safeParse({ personId: "" });
    expect(result.success).toBe(false);
  });

  it("lehnt eine manipulierte (nicht-UUID) personId bei der Entnahme ab", () => {
    const result = publicCheckoutSchema.safeParse({ personId: "<script>alert(1)</script>" });
    expect(result.success).toBe(false);
  });

  it("akzeptiert gültige Eingaben", () => {
    const result = machineInputSchema.safeParse({
      name: "Gültige Maschine",
      manufacturer: "Hilti",
      modelName: "TE 70",
      serialNumber: "SN-1",
      storageLocation: "Lager 1",
      ownershipType: "EIGENTUM",
      purchaseDate: "2024-01-01",
    });
    expect(result.success).toBe(true);
  });
});
