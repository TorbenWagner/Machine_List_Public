"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { machineInputSchema } from "@/lib/validation/machine";
import { adminCheckinSchema, lockSchema } from "@/lib/validation/transaction";
import {
  createMachine,
  setMachineActive,
  updateMachine,
} from "@/services/machines/machineService";
import {
  adminCheckinMachine,
  lockMachine,
  unlockMachine,
} from "@/services/transactions/transactionService";
import { isServiceError } from "@/lib/serviceError";
import { uiTexts } from "@/lib/ui-texts";

export interface MachineFormState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
}

function formDataToMachineInput(formData: FormData) {
  return {
    name: formData.get("name"),
    manufacturer: formData.get("manufacturer"),
    modelName: formData.get("modelName"),
    serialNumber: formData.get("serialNumber"),
    storageLocation: formData.get("storageLocation"),
    ownershipType: formData.get("ownershipType"),
    purchaseDate: formData.get("purchaseDate"),
    hiltiScanCode: formData.get("hiltiScanCode") ?? undefined,
    alternativeCode: formData.get("alternativeCode") ?? undefined,
    description: formData.get("description") ?? undefined,
    responsiblePersonId: formData.get("responsiblePersonId") ?? undefined,
    informationText: formData.get("informationText") ?? undefined,
  };
}

export async function createMachineAction(
  _prevState: MachineFormState,
  formData: FormData,
): Promise<MachineFormState> {
  const admin = await requireAdmin();
  const parsed = machineInputSchema.safeParse(formDataToMachineInput(formData));

  if (!parsed.success) {
    return { error: uiTexts.errors.validationFailed, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let createdId: string | undefined;
  try {
    const created = await createMachine(parsed.data, admin.username);
    createdId = created?.id;
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin/machines");
  redirect(`/admin/machines/${createdId}`);
}

export async function updateMachineAction(
  id: string,
  _prevState: MachineFormState,
  formData: FormData,
): Promise<MachineFormState> {
  const admin = await requireAdmin();
  const parsed = machineInputSchema.safeParse(formDataToMachineInput(formData));

  if (!parsed.success) {
    return { error: uiTexts.errors.validationFailed, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateMachine(id, parsed.data, admin.username);
    revalidatePath("/admin/machines");
    revalidatePath(`/admin/machines/${id}`);
    return {};
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }
}

export async function setMachineActiveAction(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  try {
    await setMachineActive(id, isActive, admin.username);
    revalidatePath("/admin/machines");
    revalidatePath(`/admin/machines/${id}`);
    return { error: undefined };
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }
}

export async function lockMachineAction(
  id: string,
  _prevState: MachineFormState,
  formData: FormData,
): Promise<MachineFormState> {
  const admin = await requireAdmin();
  const parsed = lockSchema.safeParse({ informationText: formData.get("informationText") ?? undefined });
  if (!parsed.success) {
    return { error: uiTexts.errors.validationFailed };
  }

  try {
    await lockMachine({ machineId: id, informationText: parsed.data.informationText, adminUsername: admin.username });
    revalidatePath("/admin/machines");
    revalidatePath(`/admin/machines/${id}`);
    return { success: true };
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }
}

export async function unlockMachineAction(id: string) {
  const admin = await requireAdmin();
  try {
    await unlockMachine({ machineId: id, adminUsername: admin.username });
    revalidatePath("/admin/machines");
    revalidatePath(`/admin/machines/${id}`);
    return { error: undefined };
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }
}

export async function adminCheckinAction(
  id: string,
  _prevState: MachineFormState,
  formData: FormData,
): Promise<MachineFormState> {
  const admin = await requireAdmin();
  const parsed = adminCheckinSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { error: uiTexts.errors.validationFailed, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await adminCheckinMachine({ machineId: id, reason: parsed.data.reason, adminUsername: admin.username });
    revalidatePath("/admin/machines");
    revalidatePath(`/admin/machines/${id}`);
    revalidatePath("/admin/history");
    return { success: true };
  } catch (error) {
    if (isServiceError(error)) return { error: error.message };
    throw error;
  }
}
