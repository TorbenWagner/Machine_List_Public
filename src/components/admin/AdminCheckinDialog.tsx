"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "./Modal";
import { adminCheckinAction, type MachineFormState } from "@/app/admin/(protected)/machines/actions";
import { uiTexts } from "@/lib/ui-texts";

const initialState: MachineFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      {pending ? uiTexts.common.loading : uiTexts.admin.machines.actions.adminCheckin}
    </button>
  );
}

/**
 * Eigene Komponente, damit useActionState bei jedem Oeffnen des Dialogs
 * (Neumontage durch die bedingte Darstellung im Elternteil) mit frischem
 * Ausgangszustand startet.
 */
function AdminCheckinModalContent({ machineId, onClose }: { machineId: string; onClose: () => void }) {
  const action = adminCheckinAction.bind(null, machineId);
  const [state, formAction] = useActionState(action, initialState);
  const t = uiTexts.admin.machines;

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          {uiTexts.publicMachine.checkinSuccessText}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          {uiTexts.common.confirm}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t.adminCheckinReasonLabel} <span className="text-red-600">*</span>
        </label>
        <textarea
          name="reason"
          required
          maxLength={2000}
          rows={3}
          placeholder={t.adminCheckinReasonPlaceholder}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

export function AdminCheckinDialog({ machineId }: { machineId: string }) {
  const [open, setOpen] = useState(false);
  const t = uiTexts.admin.machines;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        {t.actions.adminCheckin}
      </button>
      {open && (
        <Modal title={t.adminCheckinTitle} onClose={() => setOpen(false)}>
          <AdminCheckinModalContent machineId={machineId} onClose={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
