import { listHistory } from "@/services/transactions/transactionService";
import { listMachinesForQrExport } from "@/services/machines/machineService";
import { listPeople } from "@/services/people/peopleService";
import { HistoryFilters } from "@/components/admin/HistoryFilters";
import { uiTexts } from "@/lib/ui-texts";
import { formatDateTimeDe, formatIsoDateDe } from "@/lib/format";
import type { TransactionAction } from "@/db/schema";

interface PageProps {
  searchParams: Promise<{
    machineId?: string;
    personId?: string;
    action?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function AdminHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [entries, machines, people] = await Promise.all([
    listHistory({
      machineId: params.machineId,
      personId: params.personId,
      action: params.action as TransactionAction | undefined,
      dateFrom: params.from,
      dateTo: params.to,
    }),
    listMachinesForQrExport(),
    listPeople({ activeFilter: "all" }),
  ]);

  const t = uiTexts.admin.history;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>

      <HistoryFilters
        machines={machines.map((m) => ({ id: m.id, name: m.name }))}
        people={people.map((p) => ({ id: p.id, displayName: p.displayName }))}
      />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">{t.table.timestamp}</th>
              <th className="px-4 py-3">{t.table.machine}</th>
              <th className="px-4 py-3">{t.table.action}</th>
              <th className="px-4 py-3">{t.table.person}</th>
              <th className="px-4 py-3">{t.table.previousHolder}</th>
              <th className="px-4 py-3">{t.table.plannedReturn}</th>
              <th className="px-4 py-3">{t.table.projectOrLocation}</th>
              <th className="px-4 py-3">{t.table.comment}</th>
              <th className="px-4 py-3">{t.table.source}</th>
              <th className="px-4 py-3">{t.table.admin}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  {t.noResults}
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                  {formatDateTimeDe(entry.createdAt)}
                </td>
                <td className="px-4 py-3 text-gray-900">{entry.machineName}</td>
                <td className="px-4 py-3 text-gray-600">
                  {uiTexts.transactionAction[entry.action as TransactionAction]}
                </td>
                <td className="px-4 py-3 text-gray-600">{entry.selectedPersonName ?? "–"}</td>
                <td className="px-4 py-3 text-gray-600">{entry.previousHolderName ?? "–"}</td>
                <td className="px-4 py-3 text-gray-600">{formatIsoDateDe(entry.plannedReturnDate)}</td>
                <td className="px-4 py-3 text-gray-600">{entry.projectOrLocation ?? "–"}</td>
                <td className="px-4 py-3 max-w-[200px] truncate text-gray-600" title={entry.comment ?? entry.reason ?? ""}>
                  {entry.comment ?? entry.reason ?? "–"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {uiTexts.transactionSource[entry.source as "QR_APP" | "ADMIN"]}
                </td>
                <td className="px-4 py-3 text-gray-600">{entry.adminUsername ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
