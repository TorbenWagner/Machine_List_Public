"use client";

import { useState, useTransition } from "react";

interface ConfirmActionButtonProps {
  action: () => Promise<{ error?: string } | void>;
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}

/** Button fuer gefaehrliche/irreversible Aktionen mit Bestaetigungsdialog. */
export function ConfirmActionButton({
  action,
  confirmMessage,
  className,
  children,
}: ConfirmActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending} onClick={handleClick} className={className}>
        {children}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
