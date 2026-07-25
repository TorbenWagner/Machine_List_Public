import { z } from "zod";
import { ownershipTypeValues } from "@/db/schema";
import { isoDateSchema, optionalTrimmed, uuidSchema } from "./common";

export const ownershipTypeSchema = z.enum(ownershipTypeValues);

export const machineInputSchema = z.object({
  name: z.string().trim().min(1, "Maschinenname ist ein Pflichtfeld.").max(200),
  manufacturer: z.string().trim().min(1, "Hersteller ist ein Pflichtfeld.").max(200),
  modelName: z.string().trim().min(1, "Modellname ist ein Pflichtfeld.").max(200),
  serialNumber: z.string().trim().min(1, "Seriennummer ist ein Pflichtfeld.").max(200),
  storageLocation: z.string().trim().min(1, "Lagerplatz ist ein Pflichtfeld.").max(200),
  ownershipType: ownershipTypeSchema,
  purchaseDate: isoDateSchema,
  hiltiScanCode: optionalTrimmed(100),
  alternativeCode: optionalTrimmed(100),
  description: optionalTrimmed(4000),
  responsiblePersonId: z
    .union([uuidSchema, z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
  informationText: optionalTrimmed(2000),
});

export type MachineInput = z.infer<typeof machineInputSchema>;
