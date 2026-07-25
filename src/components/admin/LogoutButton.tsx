"use client";

import { useTransition } from "react";
import { logoutAction } from "@/lib/auth/logoutAction";
import { uiTexts } from "@/lib/ui-texts";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
    >
      {uiTexts.admin.logoutButton}
    </button>
  );
}
