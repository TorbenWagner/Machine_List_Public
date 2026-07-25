/**
 * Fachlicher Fehler aus der Service-Schicht. Route-Handler faengen diesen
 * Fehlertyp ab und liefern eine konsistente, verstaendliche Fehlermeldung
 * ohne interne Details preiszugeben.
 */
export class ServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
