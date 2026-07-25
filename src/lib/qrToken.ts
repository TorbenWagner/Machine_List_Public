import { randomBytes } from "node:crypto";

/**
 * Erzeugt einen QR-Token mit hoher Entropie (256 Bit Zufall, base64url-
 * kodiert). Nicht fortlaufend und nicht erratbar, siehe Sicherheitsvorgaben.
 */
export function generateQrToken(): string {
  return randomBytes(32).toString("base64url");
}
