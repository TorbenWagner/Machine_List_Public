import { config } from "dotenv";

// Vitest setzt NODE_ENV bereits auf "test"; src/db/index.ts waehlt darauf
// basierend TEST_DATABASE_URL statt DATABASE_URL.
if (process.env.NODE_ENV !== "test") {
  throw new Error(`Erwarte NODE_ENV=test in Tests, tatsaechlich: ${process.env.NODE_ENV}`);
}

config({ path: ".env.local" });
config();

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL ist nicht gesetzt. Bitte .env.local anhand von .env.example einrichten.",
  );
}
