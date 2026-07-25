import { z } from "zod";

/** Deutsches sowie ISO-Datum (YYYY-MM-DD) fuer <input type="date">. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum angeben.");

export const optionalTrimmed = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Maximal ${maxLength} Zeichen erlaubt.`)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

export const uuidSchema = z.string().uuid("Ungültige ID.");

export function isDateInPastBerlin(isoDate: string): boolean {
  const todayBerlin = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });
  return isoDate < todayBerlin;
}
