import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE_NAME = "machine_list_admin_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 Stunden

interface SessionPayload {
  username: string;
  issuedAt: number;
  expiresAt: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET ist nicht gesetzt oder zu kurz. Bitte in der Umgebungskonfiguration hinterlegen.",
    );
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

/**
 * Erzeugt ein signiertes Session-Token. `durationMs` erlaubt abweichende
 * Gueltigkeitsdauern fuer andere Session-Arten (z. B. den langlebigen
 * oeffentlichen Zugang), ohne die Admin-Sitzungsdauer zu veraendern.
 */
export function createSessionToken(username: string, durationMs: number = SESSION_DURATION_MS): string {
  const now = Date.now();
  const payload: SessionPayload = {
    username,
    issuedAt: now,
    expiresAt: now + durationMs,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/** Prueft und dekodiert ein Session-Token. Gibt null zurueck, falls ungueltig oder abgelaufen. */
export function verifySessionToken(token: string | undefined | null): { username: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof payload.username !== "string" || typeof payload.expiresAt !== "number") {
      return null;
    }
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return { username: payload.username };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;
