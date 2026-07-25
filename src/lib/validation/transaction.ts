import { z } from "zod";
import { isDateInPastBerlin, isoDateSchema, optionalTrimmed, uuidSchema } from "./common";

export const deviceInfoSchema = z.object({
  deviceId: optionalTrimmed(100),
});

export const publicCheckoutSchema = z
  .object({
    personId: uuidSchema,
    projectOrLocation: optionalTrimmed(300),
    plannedReturnDate: z
      .union([isoDateSchema, z.literal("")])
      .optional()
      .transform((value) => (value === "" || value === undefined ? undefined : value)),
    comment: optionalTrimmed(2000),
  })
  .merge(deviceInfoSchema)
  .refine(
    (data) => !data.plannedReturnDate || !isDateInPastBerlin(data.plannedReturnDate),
    {
      message: "Das geplante Rückgabedatum darf nicht in der Vergangenheit liegen.",
      path: ["plannedReturnDate"],
    },
  );

export type PublicCheckoutInput = z.infer<typeof publicCheckoutSchema>;

export const publicCheckinSchema = z
  .object({
    personId: uuidSchema,
    comment: optionalTrimmed(2000),
  })
  .merge(deviceInfoSchema);

export type PublicCheckinInput = z.infer<typeof publicCheckinSchema>;

export const adminCheckinSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Änderungsgrund ist ein Pflichtfeld.")
    .max(2000, "Maximal 2000 Zeichen erlaubt."),
});

export type AdminCheckinInput = z.infer<typeof adminCheckinSchema>;

export const lockSchema = z.object({
  informationText: optionalTrimmed(2000),
});

export type LockInput = z.infer<typeof lockSchema>;
