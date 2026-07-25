const BERLIN_TIMEZONE = "Europe/Berlin";

/** Formatiert ein Datum im deutschen Format (TT.MM.JJJJ), Zeitzone Europe/Berlin. */
export function formatDateDe(value: Date | string | null | undefined): string {
  if (!value) return "–";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("de-DE", { timeZone: BERLIN_TIMEZONE });
}

/** Formatiert Datum und Uhrzeit im deutschen Format, Zeitzone Europe/Berlin. */
export function formatDateTimeDe(value: Date | string | null | undefined): string {
  if (!value) return "–";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleString("de-DE", {
    timeZone: BERLIN_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Formatiert ein reines Datumsfeld (YYYY-MM-DD aus der DB) ohne Zeitzonenverschiebung. */
export function formatIsoDateDe(value: string | null | undefined): string {
  if (!value) return "–";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "–";
  return `${day}.${month}.${year}`;
}
