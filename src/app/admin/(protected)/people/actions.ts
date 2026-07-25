"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { personInputSchema } from "@/lib/validation/people";
import { createPerson, setPersonActive, updatePerson } from "@/services/people/peopleService";
import { isServiceError } from "@/lib/serviceError";
import { uiTexts } from "@/lib/ui-texts";

export interface PersonFormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

function formDataToPersonInput(formData: FormData) {
  return {
    displayName: formData.get("displayName"),
    personType: formData.get("personType"),
    company: formData.get("company") ?? undefined,
    employeeNumber: formData.get("employeeNumber") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") ?? undefined,
    comment: formData.get("comment") ?? undefined,
  };
}

export async function createPersonAction(
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const admin = await requireAdmin();
  const parsed = personInputSchema.safeParse(formDataToPersonInput(formData));
  if (!parsed.success) {
    return { error: uiTexts.errors.validationFailed, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let createdId: string | undefined;
  try {
    const created = await createPerson(parsed.data, admin.username);
    createdId = created?.id;
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin/people");
  redirect(`/admin/people/${createdId}`);
}

export async function updatePersonAction(
  id: string,
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const admin = await requireAdmin();
  const parsed = personInputSchema.safeParse(formDataToPersonInput(formData));
  if (!parsed.success) {
    return { error: uiTexts.errors.validationFailed, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updatePerson(id, parsed.data, admin.username);
    revalidatePath("/admin/people");
    revalidatePath(`/admin/people/${id}`);
    return {};
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }
}

export async function setPersonActiveAction(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  try {
    await setPersonActive(id, isActive, admin.username);
    revalidatePath("/admin/people");
    revalidatePath(`/admin/people/${id}`);
    return { error: undefined };
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }
}
