"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { publicAccessAction, type PublicAccessActionState } from "@/app/zugang/actions";
import { uiTexts } from "@/lib/ui-texts";

const initialState: PublicAccessActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      {pending ? uiTexts.common.loading : uiTexts.publicAccess.submitButton}
    </button>
  );
}

export function PublicAccessForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(publicAccessAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
          {uiTexts.publicAccess.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
