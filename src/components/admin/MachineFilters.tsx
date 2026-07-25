"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef } from "react";
import { machineStatusValues, ownershipTypeValues } from "@/db/schema";
import { uiTexts } from "@/lib/ui-texts";

export function MachineFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("search", value), 300);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(event) => handleSearchChange(event.target.value)}
        placeholder={uiTexts.admin.machines.searchPlaceholder}
        className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <select
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(event) => updateParam("status", event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        aria-label={uiTexts.admin.machines.filterStatus}
      >
        <option value="">{uiTexts.admin.machines.filterStatus}</option>
        {machineStatusValues.map((status) => (
          <option key={status} value={status}>
            {uiTexts.machineStatus[status]}
          </option>
        ))}
      </select>
      <select
        defaultValue={searchParams.get("ownershipType") ?? ""}
        onChange={(event) => updateParam("ownershipType", event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        aria-label={uiTexts.admin.machines.filterOwnership}
      >
        <option value="">{uiTexts.admin.machines.filterOwnership}</option>
        {ownershipTypeValues.map((type) => (
          <option key={type} value={type}>
            {uiTexts.ownershipType[type]}
          </option>
        ))}
      </select>
      <select
        defaultValue={searchParams.get("activeFilter") ?? "active"}
        onChange={(event) => updateParam("activeFilter", event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        aria-label={uiTexts.admin.machines.filterActive}
      >
        <option value="all">{uiTexts.admin.machines.all}</option>
        <option value="active">{uiTexts.admin.machines.onlyActive}</option>
        <option value="inactive">{uiTexts.admin.machines.onlyInactive}</option>
      </select>
    </div>
  );
}
