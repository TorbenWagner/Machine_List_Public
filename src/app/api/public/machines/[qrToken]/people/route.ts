import { NextResponse, type NextRequest } from "next/server";
import { listActivePeoplePublic } from "@/services/people/peopleService";
import { handleApiError } from "@/lib/apiResponse";
import { requirePublicAccessApi } from "@/lib/auth/publicAccess";

/**
 * Liefert nur die oeffentlich zulaessigen Personenfelder (id, displayName,
 * company, personType) fuer aktive Personen. Keine Kontakt- oder
 * Auditdaten (siehe Sicherheitsvorgaben Abschnitt 14).
 */
export async function GET(request: NextRequest) {
  const gate = requirePublicAccessApi(request);
  if (gate) return gate;

  try {
    const people = await listActivePeoplePublic();
    return NextResponse.json(people);
  } catch (error) {
    return handleApiError(error);
  }
}
