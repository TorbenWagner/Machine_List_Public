"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { personTypeValues } from "@/db/schema";
import { uiTexts } from "@/lib/ui-texts";
import type { PersonFormState } from "@/app/admin/(protected)/people/actions";

interface PersonFormProps {
  action: (prevState: PersonFormState, formData: FormData) => Promise<PersonFormState>;
  mode: "create" | "edit";
  defaultValues?: {
    displayName?: string;
    personType?: string;
    company?: string | null;
    employeeNumber?: string | null;
    phone?: string | null;
    email?: string | null;
    comment?: string | null;
  };
}

const initialState: PersonFormState = {};

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

export function PersonForm({ action, mode, defaultValues }: PersonFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const t = uiTexts.admin.people.form;
  const dv = defaultValues ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t.displayName} <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="displayName"
            defaultValue={dv.displayName ?? ""}
            required
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {fieldError(state.fieldErrors, "displayName")}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t.personType} <span className="text-red-600">*</span>
          </label>
          <select
            name="personType"
            defaultValue={dv.personType ?? personTypeValues[0]}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {personTypeValues.map((value) => (
              <option key={value} value={value}>
                {uiTexts.personType[value]}
              </option>
            ))}
          </select>
          {fieldError(state.fieldErrors, "personType")}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t.company} <span className="text-gray-400">({uiTexts.common.optional})</span>
          </label>
          <input
            type="text"
            name="company"
            defaultValue={dv.company ?? ""}
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t.employeeNumber} <span className="text-gray-400">({uiTexts.common.optional})</span>
          </label>
          <input
            type="text"
            name="employeeNumber"
            defaultValue={dv.employeeNumber ?? ""}
            maxLength={50}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t.phone} <span className="text-gray-400">({uiTexts.common.optional})</span>
          </label>
          <input
            type="tel"
            name="phone"
            defaultValue={dv.phone ?? ""}
            maxLength={50}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t.email} <span className="text-gray-400">({uiTexts.common.optional})</span>
          </label>
          <input
            type="email"
            name="email"
            defaultValue={dv.email ?? ""}
            maxLength={200}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {fieldError(state.fieldErrors, "email")}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t.comment} <span className="text-gray-400">({uiTexts.common.optional})</span>
        </label>
        <textarea
          name="comment"
          defaultValue={dv.comment ?? ""}
          maxLength={2000}
          rows={3}
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
