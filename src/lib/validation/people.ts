import { z } from "zod";
import { personTypeValues } from "@/db/schema";
import { optionalTrimmed } from "./common";

export const personTypeSchema = z.enum(personTypeValues);

export const personInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Anzeigename ist ein Pflichtfeld.")
    .max(200, "Maximal 200 Zeichen erlaubt."),
  personType: personTypeSchema,
  company: optionalTrimmed(200),
  employeeNumber: optionalTrimmed(50),
  phone: optionalTrimmed(50),
  email: z
    .string()
    .trim()
    .max(200)
    .email("Bitte eine gültige E-Mail-Adresse angeben.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? undefined : value)),
  comment: optionalTrimmed(2000),
});

export type PersonInput = z.infer<typeof personInputSchema>;
