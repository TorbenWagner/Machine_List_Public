import Link from "next/link";
import { listPeople } from "@/services/people/peopleService";
import { setPersonActiveAction } from "./actions";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { uiTexts } from "@/lib/ui-texts";
import type { PersonType } from "@/db/schema";

interface PageProps {
  searchParams: Promise<{ search?: string; activeFilter?: string }>;
}

export default async function AdminPeoplePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeFilter = (params.activeFilter as "all" | "active" | "inactive" | undefined) ?? "active";
  const people = await listPeople({ search: params.search, activeFilter });
  const t = uiTexts.admin.people;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
        <Link
          href="/admin/people/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t.newButton}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">{t.table.displayName}</th>
              <th className="px-4 py-3">{t.table.personType}</th>
              <th className="px-4 py-3">{t.table.company}</th>
              <th className="px-4 py-3">{t.table.active}</th>
              <th className="px-4 py-3 text-right">{t.table.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {people.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {t.noResults}
                </td>
              </tr>
            )}
            {people.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link href={`/admin/people/${person.id}`} className="hover:text-blue-600">
                    {person.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {uiTexts.personType[person.personType as PersonType]}
                </td>
                <td className="px-4 py-3 text-gray-600">{person.company ?? "–"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {person.isActive ? uiTexts.common.active : uiTexts.common.inactive}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    <Link
                      href={`/admin/people/${person.id}`}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {uiTexts.common.edit}
                    </Link>
                    <Link
                      href={`/admin/history?personId=${person.id}`}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Historie
                    </Link>
                    {person.isActive ? (
                      <ConfirmActionButton
                        action={setPersonActiveAction.bind(null, person.id, false)}
                        confirmMessage={t.confirmDeactivate}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {uiTexts.admin.machines.actions.deactivate}
                      </ConfirmActionButton>
                    ) : (
                      <ConfirmActionButton
                        action={setPersonActiveAction.bind(null, person.id, true)}
                        confirmMessage={t.confirmReactivate}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {uiTexts.admin.machines.actions.reactivate}
                      </ConfirmActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
