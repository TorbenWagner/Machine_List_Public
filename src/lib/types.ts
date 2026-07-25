import type { MachineStatus, PersonType } from "@/db/schema";

export interface PublicPerson {
  id: string;
  displayName: string;
  company: string | null;
  personType: PersonType;
}

export interface PublicMachine {
  name: string;
  manufacturer: string;
  modelName: string;
  description: string | null;
  status: MachineStatus;
  storageLocation: string | null;
  informationText: string | null;
  currentUserName: string | null;
  currentCheckoutAt: string | null;
  currentPlannedReturnDate: string | null;
  currentProjectOrLocation: string | null;
  isActive: boolean;
}

/** Anzeigename einer Person inkl. Firma, siehe Abschnitt 10.1. */
export function formatPersonLabel(person: Pick<PublicPerson, "displayName" | "company">): string {
  return person.company ? `${person.displayName} – ${person.company}` : person.displayName;
}
