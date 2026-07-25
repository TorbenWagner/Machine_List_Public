import { NextResponse } from "next/server";
import { listActivePeoplePublic } from "@/services/people/peopleService";
import { handleApiError } from "@/lib/apiResponse";

/**
 * Liefert nur die oeffentlich zulaessigen Personenfelder (id, displayName,
 * company, personType) fuer aktive Personen. Keine Kontakt- oder
 * Auditdaten (siehe Sicherheitsvorgaben Abschnitt 14).
 */
export async function GET() {
  try {
    const people = await listActivePeoplePublic();
    return NextResponse.json(people);
  } catch (error) {
    return handleApiError(error);
  }
}
