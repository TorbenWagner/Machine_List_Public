import { eq } from "drizzle-orm";
import { machines, people, transactions } from "../schema";
import { generateQrToken } from "../../lib/qrToken";

// Locker typisiert, damit sowohl der volle Drizzle-Client (CLI-Skript) als
// auch eine Transaktion (Tests) hier uebergeben werden koennen.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbLike = any;

export interface SeedMachineRef {
  id: string;
  qrToken: string;
  name: string;
}

export interface SeedPersonRef {
  id: string;
  displayName: string;
}

export interface SeedResult {
  employees: SeedPersonRef[];
  subcontractors: SeedPersonRef[];
  inactivePerson: SeedPersonRef;
  machines: {
    inStorage: SeedMachineRef[];
    checkedOut: (SeedMachineRef & { currentPersonId: string })[];
    locked: SeedMachineRef;
    inactive: SeedMachineRef;
  };
}

/**
 * Fiktive Testdaten. NICHT inkrementell: setzt people/machines/transactions
 * bei jedem Aufruf vollstaendig zurueck (truncate) und legt den definierten
 * Ausgangszustand neu an. Wird sowohl vom CLI-Seed-Skript als auch von den
 * automatisierten Tests verwendet, damit beide denselben, garantiert
 * konsistenten Ausgangszustand erzeugen.
 */
export async function seedDatabase(db: DbLike): Promise<SeedResult> {
  await db.execute(`truncate table audit_log, transactions, machines, people restart identity cascade;`);

  const employeeNames = [
    "Anna Beispiel",
    "Bernd Fiktiv",
    "Carla Muster",
    "Dennis Test",
    "Erika Beispielhaft",
    "Frank Musterhaft",
    "Gudrun Fiktion",
    "Hans Probe",
  ];
  const subcontractorNames = ["Ismail Auftrag", "Julia Fremdfirma", "Klaus Extern"];

  const employeeRows = await db
    .insert(people)
    .values(
      employeeNames.map((name, index) => ({
        displayName: name,
        personType: "MITARBEITER" as const,
        company: "Beispiel Bau GmbH",
        employeeNumber: `MA-${String(index + 1).padStart(3, "0")}`,
        phone: "+49 30 1234567",
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@beispiel-bau.example`,
        isActive: true,
      })),
    )
    .returning();

  const subcontractorRows = await db
    .insert(people)
    .values(
      subcontractorNames.map((name, index) => ({
        displayName: name,
        personType: "SUBUNTERNEHMER" as const,
        company: `Fremdfirma ${index + 1} GmbH`,
        isActive: true,
      })),
    )
    .returning();

  const [inactivePersonRow] = await db
    .insert(people)
    .values({
      displayName: "Peter Ehemalig",
      personType: "MITARBEITER",
      company: "Beispiel Bau GmbH",
      employeeNumber: "MA-099",
      isActive: false,
      comment: "Nicht mehr im Unternehmen (fiktive Testdaten).",
    })
    .returning();

  const machineDefinitions = [
    { name: "Bohrhammer TE 70", manufacturer: "Hilti", modelName: "TE 70-ATC/AVR", serialNumber: "HLT-0001", storageLocation: "Lager Halle 1, Regal A3", ownershipType: "EIGENTUM" as const, purchaseDate: "2021-03-15", hiltiScanCode: "HSC-000001" },
    { name: "Winkelschleifer GWS 24", manufacturer: "Bosch", modelName: "GWS 24-230 JH", serialNumber: "BSH-0002", storageLocation: "Lager Halle 1, Regal B1", ownershipType: "EIGENTUM" as const, purchaseDate: "2022-06-01" },
    { name: "Akkuschrauber DDF", manufacturer: "Makita", modelName: "DDF484Z", serialNumber: "MKT-0003", storageLocation: "Lager Halle 2, Regal C2", ownershipType: "EIGENTUM" as const, purchaseDate: "2023-01-10" },
    { name: "Trennschleifer M18", manufacturer: "Milwaukee", modelName: "M18 FCOS230", serialNumber: "MIL-0004", storageLocation: "Lager Halle 2, Regal C4", ownershipType: "FLOTTE" as const, purchaseDate: "2023-09-01" },
    { name: "Kernbohrgeraet DD 350", manufacturer: "Hilti", modelName: "DD 350-CA", serialNumber: "HLT-0005", storageLocation: "Lager Halle 1, Regal A1", ownershipType: "FLOTTE" as const, purchaseDate: "2024-02-20", hiltiScanCode: "HSC-000005" },
    { name: "Laubblaeser GBL", manufacturer: "Bosch", modelName: "GBL 18V-120", serialNumber: "BSH-0006", storageLocation: "Lager Halle 3, Regal D1", ownershipType: "EIGENTUM" as const, purchaseDate: "2022-11-05" },
    { name: "Schlagbohrmaschine HP", manufacturer: "Makita", modelName: "HP2050", serialNumber: "MKT-0007", storageLocation: "Lager Halle 2, Regal C1", ownershipType: "EIGENTUM" as const, purchaseDate: "2021-08-19", alternativeCode: "ALT-0007" },
    { name: "Stichsaege M18", manufacturer: "Milwaukee", modelName: "M18 FJS-0", serialNumber: "MIL-0008", storageLocation: "Lager Halle 3, Regal D3", ownershipType: "FLOTTE" as const, purchaseDate: "2023-04-14" },
    { name: "Baustellenradio", manufacturer: "Makita", modelName: "DMR115", serialNumber: "MKT-0009", storageLocation: "Lager Halle 1, Regal A5", ownershipType: "EIGENTUM" as const, purchaseDate: "2020-05-30" },
    { name: "Bohrhammer TE 6", manufacturer: "Hilti", modelName: "TE 6-A36", serialNumber: "HLT-0010", storageLocation: "Lager Halle 2, Regal B4", ownershipType: "EIGENTUM" as const, purchaseDate: "2019-10-01", hiltiScanCode: "HSC-000010" },
  ];

  const responsiblePersonId = employeeRows[0].id;

  const createdMachines = await db
    .insert(machines)
    .values(
      machineDefinitions.map((def) => ({
        ...def,
        qrToken: generateQrToken(),
        responsiblePersonId,
        description: `Fiktive Testmaschine (${def.manufacturer} ${def.modelName}).`,
      })),
    )
    .returning();

  // Indizes: 0-5 IM_LAGER, 6-7 AUSGELIEHEN, 8 GESPERRT, 9 deaktiviert.
  const checkedOutMachine1 = createdMachines[6];
  const checkedOutMachine2 = createdMachines[7];
  const lockedMachine = createdMachines[8];
  const inactiveMachine = createdMachines[9];

  const checkoutTime1 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
  const checkoutTime2 = new Date(Date.now() - 1000 * 60 * 60 * 5);

  await db
    .update(machines)
    .set({
      status: "AUSGELIEHEN",
      currentPersonId: employeeRows[1].id,
      currentCheckoutAt: checkoutTime1,
      currentProjectOrLocation: "Baustelle Musterstraße 12, Berlin",
    })
    .where(eq(machines.id, checkedOutMachine1.id));

  await db.insert(transactions).values({
    machineId: checkedOutMachine1.id,
    action: "CHECKOUT",
    selectedPersonId: employeeRows[1].id,
    projectOrLocation: "Baustelle Musterstraße 12, Berlin",
    source: "QR_APP",
    createdAt: checkoutTime1,
  });

  await db
    .update(machines)
    .set({
      status: "AUSGELIEHEN",
      currentPersonId: subcontractorRows[0].id,
      currentCheckoutAt: checkoutTime2,
      currentProjectOrLocation: "Baustelle Am Ring 4, Potsdam",
    })
    .where(eq(machines.id, checkedOutMachine2.id));

  await db.insert(transactions).values({
    machineId: checkedOutMachine2.id,
    action: "CHECKOUT",
    selectedPersonId: subcontractorRows[0].id,
    projectOrLocation: "Baustelle Am Ring 4, Potsdam",
    source: "QR_APP",
    createdAt: checkoutTime2,
  });

  const lockTime = new Date(Date.now() - 1000 * 60 * 60 * 24);
  await db
    .update(machines)
    .set({
      status: "GESPERRT",
      informationText: "Wartung ausstehend - bitte nicht entnehmen (fiktive Testdaten).",
    })
    .where(eq(machines.id, lockedMachine.id));

  await db.insert(transactions).values({
    machineId: lockedMachine.id,
    action: "LOCK",
    comment: "Wartung ausstehend - bitte nicht entnehmen (fiktive Testdaten).",
    source: "ADMIN",
    adminUsername: "admin",
    createdAt: lockTime,
  });

  await db.update(machines).set({ isActive: false }).where(eq(machines.id, inactiveMachine.id));

  return {
    employees: employeeRows.map((r: { id: string; displayName: string }) => ({ id: r.id, displayName: r.displayName })),
    subcontractors: subcontractorRows.map((r: { id: string; displayName: string }) => ({ id: r.id, displayName: r.displayName })),
    inactivePerson: { id: inactivePersonRow.id, displayName: inactivePersonRow.displayName },
    machines: {
      inStorage: createdMachines.slice(0, 6).map(toMachineRef),
      checkedOut: [
        { ...toMachineRef(checkedOutMachine1), currentPersonId: employeeRows[1].id },
        { ...toMachineRef(checkedOutMachine2), currentPersonId: subcontractorRows[0].id },
      ],
      locked: toMachineRef(lockedMachine),
      inactive: toMachineRef(inactiveMachine),
    },
  };
}

function toMachineRef(row: { id: string; qrToken: string; name: string }): SeedMachineRef {
  return { id: row.id, qrToken: row.qrToken, name: row.name };
}
