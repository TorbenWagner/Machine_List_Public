import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, verifySessionToken } from "./session";
import { uiTexts } from "@/lib/ui-texts";

/** Liefert den angemeldeten Administrator-Benutzernamen oder null. */
export async function getCurrentAdmin(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Serverseitiger Routenschutz fuer Admin-Seiten. Leitet ohne gueltige
 * Sitzung auf die Login-Seite um. In Server Components/Layouts verwenden.
 */
export async function requireAdmin(): Promise<{ username: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}

/**
 * Serverseitiger Routenschutz fuer Admin-API-Routen. Gibt entweder den
 * angemeldeten Administrator oder eine fertige 401-Response zurueck.
 */
export async function requireAdminApi(): Promise<
  { admin: { username: string }; response: null } | { admin: null; response: NextResponse }
> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return {
      admin: null,
      response: NextResponse.json(
        { error: uiTexts.errors.unauthorized },
        { status: 401 },
      ),
    };
  }
  return { admin, response: null };
}
