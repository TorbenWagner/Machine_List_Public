"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { transactionActionValues } from "@/db/schema";
import { uiTexts } from "@/lib/ui-texts";

interface HistoryFiltersProps {
  machines: { id: string; name: string }[];
  people: { id: string; displayName: string }[];
}

export function HistoryFilters({ machines, people }: HistoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = uiTexts.admin.history;

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        defaultValue={searchParams.get("machineId") ?? ""}
        onChange={(event) => updateParam("machineId", event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        aria-label={t.filterMachine}
      >
        <option value="">{t.filterMachine}</option>
        {machines.map((machine) => (
          <option key={machine.id} value={machine.id}>
            {machine.name}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("personId") ?? ""}
        onChange={(event) => updateParam("personId", event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        aria-label={t.filterPerson}
      >
        <option value="">{t.filterPerson}</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("action") ?? ""}
        onChange={(event) => updateParam("action", event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        aria-label={t.filterAction}
      >
        <option value="">{t.filterAction}</option>
        {transactionActionValues.map((action) => (
          <option key={action} value={action}>
            {uiTexts.transactionAction[action]}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        {t.filterFrom}
        <input
          type="date"
          defaultValue={searchParams.get("from") ?? ""}
          onChange={(event) => updateParam("from", event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        {t.filterTo}
        <input
          type="date"
          defaultValue={searchParams.get("to") ?? ""}
          onChange={(event) => updateParam("to", event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}
