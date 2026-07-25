"use client";

const DEVICE_ID_STORAGE_KEY = "machine_list_device_id";

/**
 * Liefert eine zufaellige, im Browser gespeicherte Geraete-ID. Wird beim
 * ersten Aufruf erzeugt und in localStorage abgelegt. Dient ausschliesslich
 * der internen Nachvollziehbarkeit, kein Fingerprinting und kein
 * rechtssicherer Identitaetsnachweis.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;

    const generated = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    // localStorage nicht verfuegbar (z. B. Privatmodus) - Geraete-ID entfaellt.
    return "";
  }
}
