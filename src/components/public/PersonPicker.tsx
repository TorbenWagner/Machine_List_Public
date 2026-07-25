"use client";

import { useMemo, useState } from "react";
import { formatPersonLabel, type PublicPerson } from "@/lib/types";
import { uiTexts } from "@/lib/ui-texts";

interface PersonPickerProps {
  people: PublicPerson[];
  value: string | null;
  onChange: (personId: string) => void;
  disabled?: boolean;
}

export function PersonPicker({ people, value, onChange, disabled }: PersonPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) =>
      formatPersonLabel(person).toLowerCase().includes(term),
    );
  }, [people, search]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={uiTexts.publicMachine.formPersonSearchPlaceholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
        aria-label={uiTexts.publicMachine.formPersonSearchPlaceholder}
      />
      <div
        role="listbox"
        aria-label={uiTexts.publicMachine.formPersonLabel}
        className="max-h-56 overflow-y-auto rounded-lg border border-gray-300 divide-y divide-gray-100"
      >
        {filtered.length === 0 && (
          <p className="px-4 py-3 text-sm text-gray-500">{uiTexts.publicMachine.noPeopleFound}</p>
        )}
        {filtered.map((person) => {
          const selected = person.id === value;
          return (
            <button
              type="button"
              key={person.id}
              role="option"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => onChange(person.id)}
              className={`block w-full px-4 py-3 text-left text-base transition-colors disabled:cursor-not-allowed ${
                selected
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-900 hover:bg-blue-50"
              }`}
            >
              {formatPersonLabel(person)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
