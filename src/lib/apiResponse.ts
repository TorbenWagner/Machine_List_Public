import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isServiceError } from "@/lib/serviceError";
import { uiTexts } from "@/lib/ui-texts";

/**
 * Einheitliche Fehlerbehandlung fuer API-Route-Handler. Liefert
 * konsistente HTTP-Statuscodes und verstaendliche Fehlermeldungen, ohne
 * Stacktraces oder interne Details preiszugeben (siehe Sicherheitsvorgaben).
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: uiTexts.errors.validationFailed,
        fieldErrors: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (isServiceError(error)) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  console.error("Unerwarteter Fehler in einer API-Route:", error);
  return NextResponse.json({ error: uiTexts.common.unknownError }, { status: 500 });
}
