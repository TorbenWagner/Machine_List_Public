"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ownershipTypeValues, type MachineStatus } from "@/db/schema";
import { uiTexts } from "@/lib/ui-texts";
import type { MachineFormState } from "@/app/admin/(protected)/machines/actions";

export interface ResponsiblePersonOption {
  id: string;
  displayName: string;
}

interface MachineFormProps {
  action: (prevState: MachineFormState, formData: FormData) => Promise<MachineFormState>;
  responsiblePeople: ResponsiblePersonOption[];
  mode: "create" | "edit";
  defaultValues?: {
    name?: string;
    manufacturer?: string;
    modelName?: string;
    serialNumber?: string;
    storageLocation?: string;
    ownershipType?: string;
    purchaseDate?: string;
    hiltiScanCode?: string | null;
    alternativeCode?: string | null;
    description?: string | null;
    responsiblePersonId?: string | null;
    informationText?: string | null;
    qrToken?: string;
    status?: MachineStatus;
  };
}

const initialState: MachineFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
    >
      {pending ? uiTexts.common.loading : label}
    </button>
  );
}

function fieldError(fieldErrors: Record<string, string[] | undefined> | undefined, name: string) {
  const errors = fieldErrors?.[name];
  if (!errors || errors.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export function MachineForm({ action, responsiblePeople, mode, defaultValues }: MachineFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const t = uiTexts.admin.machines.form;
  const dv = defaultValues ?? {};
  const isOwned = (dv.ownershipType ?? "EIGENTUM") === "EIGENTUM";

  return (
    <form action={formAction} className="space-y-5">
      {dv.qrToken && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-500">{t.qrToken}</label>
          <input
            type="text"
            value={dv.qrToken}
            disabled
            readOnly
            className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t.name} name="name" defaultValue={dv.name} required maxLength={200} error={fieldError(state.fieldErrors, "name")} />
        <Field label={t.manufacturer} name="manufacturer" defaultValue={dv.manufacturer} required maxLength={200} error={fieldError(state.fieldErrors, "manufacturer")} />
        <Field label={t.modelName} name="modelName" defaultValue={dv.modelName} required maxLength={200} error={fieldError(state.fieldErrors, "modelName")} />
        <Field label={t.serialNumber} name="serialNumber" defaultValue={dv.serialNumber} required maxLength={200} error={fieldError(state.fieldErrors, "serialNumber")} />
        <Field label={t.storageLocation} name="storageLocation" defaultValue={dv.storageLocation} required maxLength={200} error={fieldError(state.fieldErrors, "storageLocation")} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t.ownershipType} *</label>
          <select
            name="ownershipType"
            defaultValue={dv.ownershipType ?? ownershipTypeValues[0]}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {ownershipTypeValues.map((value) => (
              <option key={value} value={value}>
                {uiTexts.ownershipType[value]}
              </option>
            ))}
          </select>
          {fieldError(state.fieldErrors, "ownershipType")}
        </div>

        <Field
          label={isOwned ? t.purchaseDateOwned : t.purchaseDateFleet}
          name="purchaseDate"
          type="date"
          defaultValue={dv.purchaseDate}
          required
          error={fieldError(state.fieldErrors, "purchaseDate")}
        />

        <Field label={t.hiltiScanCode} name="hiltiScanCode" defaultValue={dv.hiltiScanCode ?? ""} maxLength={100} optional error={fieldError(state.fieldErrors, "hiltiScanCode")} />
        <Field label={t.alternativeCode} name="alternativeCode" defaultValue={dv.alternativeCode ?? ""} maxLength={100} optional error={fieldError(state.fieldErrors, "alternativeCode")} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t.responsiblePerson} <span className="text-gray-400">({uiTexts.common.optional})</span>
          </label>
          <select
            name="responsiblePersonId"
            defaultValue={dv.responsiblePersonId ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">{t.responsiblePersonNone}</option>
            {responsiblePeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
          {fieldError(state.fieldErrors, "responsiblePersonId")}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t.description} <span className="text-gray-400">({uiTexts.common.optional})</span>
        </label>
        <textarea
          name="description"
          defaultValue={dv.description ?? ""}
          maxLength={4000}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t.informationText} <span className="text-gray-400">({uiTexts.common.optional})</span>
        </label>
        <textarea
          name="informationText"
          defaultValue={dv.informationText ?? ""}
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton label={mode === "create" ? t.submitCreate : t.submitUpdate} />
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  optional,
  maxLength,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  optional?: boolean;
  maxLength?: number;
  error?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-600">*</span>}
        {optional && <span className="text-gray-400">({uiTexts.common.optional})</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {error}
    </div>
  );
}
