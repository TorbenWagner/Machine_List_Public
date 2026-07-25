import { config } from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "node:path";

config({ path: ".env.local" });
config();

function resolveTargetUrl(): string {
  const useTestDb = process.argv.includes("--test");
  const url = useTestDb
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      useTestDb
        ? "TEST_DATABASE_URL ist nicht gesetzt."
        : "DATABASE_URL ist nicht gesetzt.",
    );
  }
  return url;
}

async function main() {
  const url = resolveTargetUrl();
  const migrationClient = postgres(url, { max: 1 });
  const db = drizzle(migrationClient);

  console.log(`Fuehre Migrationen aus gegen: ${url.replace(/:[^:@]*@/, ":***@")}`);
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "src/db/migrations"),
  });
  console.log("Migrationen erfolgreich angewendet.");
  await migrationClient.end();
}

main().catch((error) => {
  console.error("Migration fehlgeschlagen:", error);
  process.exit(1);
});
