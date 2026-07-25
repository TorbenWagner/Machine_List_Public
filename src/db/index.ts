import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function resolveDatabaseUrl(): string {
  const url =
    process.env.NODE_ENV === "test"
      ? process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
      : process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Bitte .env.local anhand von .env.example anlegen.",
    );
  }
  return url;
}

declare global {
  var __machineListQueryClient: ReturnType<typeof postgres> | undefined;
}

function getQueryClient() {
  if (!globalThis.__machineListQueryClient) {
    globalThis.__machineListQueryClient = postgres(resolveDatabaseUrl(), {
      max: 10,
    });
  }
  return globalThis.__machineListQueryClient;
}

export const queryClient = getQueryClient();
export const db = drizzle(queryClient, { schema });
export type Database = typeof db;
