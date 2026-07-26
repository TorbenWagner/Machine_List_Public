import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, verifySessionToken } from "./session";
import { uiTexts } from "@/lib/ui-texts";

export const PUBLIC_ACCESS_COOKIE_NAME = "machine_list_public_access";
export const PUBLIC_ACCESS_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 365 Tage
export const PUBLIC_ACCESS_COOKIE_MAX_AGE_SECONDS = PUBLIC_ACCESS_DURATION_MS / 1000;

const PUBLIC_ACCESS_SUBJECT = "public";

/** Erzeugt ein langlebiges Zugangs-Token fuer den gemeinsamen oeffentlichen Zugang. */
export function createPublicAccessToken(): string {
  return createSessionToken(PUBLIC_ACCESS_SUBJECT, PUBLIC_ACCESS_DURATION_MS);
}

export async function hasPublicAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PUBLIC_ACCESS_COOKIE_NAME)?.value;
  return verifySessionToken(token) !== null;
}

/**
 * Serverseitiger Routenschutz fuer die oeffentliche QR-Anwendung. Leitet
 * ohne gueltiges Zugangs-Cookie auf die Zugangsseite um und traegt den
 * urspruenglich angeforderten Pfad als `next`-Parameter, damit man danach
 * automatisch auf der gewuenschten Maschinenseite landet.
 */
export async function requirePublicAccess(currentPath: string): Promise<void> {
  const granted = await hasPublicAccess();
  if (!granted) {
    redirect(`/zugang?next=${encodeURIComponent(currentPath)}`);
  }
}

/**
 * Liest das Zugangs-Cookie direkt aus dem Request-Objekt (nicht ueber
 * next/headers), da API-Route-Handler das Request-Objekt ohnehin erhalten.
 * Dadurch funktioniert die Pruefung auch ausserhalb des Next.js-Servers
 * (z. B. in automatisierten Tests), im Gegensatz zu next/headers' cookies(),
 * das einen echten Request-Scope voraussetzt.
 */
function hasPublicAccessFromRequest(request: NextRequest): boolean {
  const token = request.cookies.get(PUBLIC_ACCESS_COOKIE_NAME)?.value;
  return verifySessionToken(token) !== null;
}

/**
 * Serverseitiger Routenschutz fuer die oeffentlichen API-Routen. Gibt eine
 * fertige 401-Response zurueck, falls kein gueltiges Zugangs-Cookie vorliegt,
 * sonst null.
 */
export function requirePublicAccessApi(request: NextRequest): NextResponse | null {
  if (!hasPublicAccessFromRequest(request)) {
    return NextResponse.json({ error: uiTexts.errors.unauthorized }, { status: 401 });
  }
  return null;
}
