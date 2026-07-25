import { db } from "@/db";
import { seedDatabase, type SeedResult } from "@/db/seed/seedDatabase";

/** Setzt die Testdatenbank auf den definierten Seed-Ausgangszustand zurueck. */
export async function resetAndSeed(): Promise<SeedResult> {
  return seedDatabase(db);
}

export { db };
