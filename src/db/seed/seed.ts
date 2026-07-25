import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { seedDatabase } from "./seedDatabase";

config({ path: ".env.local" });
config();

function resolveTargetUrl(): string {
  const useTestDb = process.argv.includes("--test");
  const url = useTestDb ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(useTestDb ? "TEST_DATABASE_URL ist nicht gesetzt." : "DATABASE_URL ist nicht gesetzt.");
  }
  return url;
}

/**
 * Seed-Skript mit ausschliesslich fiktiven Testdaten.
 *
 * Das Skript ist NICHT inkrementell: Es setzt die operativen Testdaten
 * (people, machines, transactions) bei jedem Aufruf vollstaendig zurueck
 * und legt den definierten Ausgangszustand neu an (siehe seedDatabase.ts).
 * Das macht Testlaeufe reproduzierbar, unabhaengig davon wie oft der Seed
 * zuvor ausgefuehrt wurde. audit_log wird durch die Trigger beim Neuanlegen
 * automatisch mitgeschrieben und daher hier nicht separat behandelt.
 */
async function main() {
  const url = resolveTargetUrl();
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log(`Seed wird ausgefuehrt gegen: ${url.replace(/:[^:@]*@/, ":***@")}`);

  const result = await seedDatabase(db);

  console.log("Seed erfolgreich abgeschlossen:");
  console.log(`- ${result.employees.length} aktive Mitarbeiter`);
  console.log(`- ${result.subcontractors.length} aktive Subunternehmer`);
  console.log("- 1 inaktive Person");
  console.log(
    `- ${result.machines.inStorage.length + result.machines.checkedOut.length + 2} Maschinen ` +
      `(${result.machines.inStorage.length} im Lager, ${result.machines.checkedOut.length} ausgeliehen, 1 gesperrt, 1 deaktiviert)`,
  );

  await client.end();
}

main().catch((error) => {
  console.error("Seed fehlgeschlagen:", error);
  process.exit(1);
});
