import Link from "next/link";
import { listMachines } from "@/services/machines/machineService";
import { setMachineActiveAction } from "./actions";
import { MachineFilters } from "@/components/admin/MachineFilters";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { uiTexts } from "@/lib/ui-texts";
import type { MachineStatus, OwnershipType } from "@/db/schema";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    ownershipType?: string;
    activeFilter?: string;
  }>;
}

export default async function AdminMachinesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeFilter = (params.activeFilter as "all" | "active" | "inactive" | undefined) ?? "active";

  const machines = await listMachines({
    search: params.search,
    status: params.status as MachineStatus | undefined,
    ownershipType: params.ownershipType as OwnershipType | undefined,
    activeFilter,
  });

  const t = uiTexts.admin.machines;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
        <Link
          href="/admin/machines/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t.newButton}
        </Link>
      </div>

      <MachineFilters />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">{t.table.name}</th>
              <th className="px-4 py-3">{t.table.manufacturer}</th>
              <th className="px-4 py-3">{t.table.model}</th>
              <th className="px-4 py-3">{t.table.serialNumber}</th>
              <th className="px-4 py-3">{t.table.status}</th>
              <th className="px-4 py-3">{t.table.currentUser}</th>
              <th className="px-4 py-3">{t.table.storageLocation}</th>
              <th className="px-4 py-3">{t.table.ownership}</th>
              <th className="px-4 py-3">{t.table.active}</th>
              <th className="px-4 py-3 text-right">{t.table.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {machines.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  {t.noResults}
                </td>
              </tr>
            )}
            {machines.map((machine) => (
              <tr key={machine.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link href={`/admin/machines/${machine.id}`} className="hover:text-blue-600">
                    {machine.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{machine.manufacturer}</td>
                <td className="px-4 py-3 text-gray-600">{machine.modelName}</td>
                <td className="px-4 py-3 text-gray-600">{machine.serialNumber}</td>
                <td className="px-4 py-3">
                  <StatusPill status={machine.status as MachineStatus} />
                </td>
                <td className="px-4 py-3 text-gray-600">{machine.currentPersonName ?? "–"}</td>
                <td className="px-4 py-3 text-gray-600">{machine.storageLocation}</td>
                <td className="px-4 py-3 text-gray-600">
                  {uiTexts.ownershipType[machine.ownershipType as OwnershipType]}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {machine.isActive ? uiTexts.common.active : uiTexts.common.inactive}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    <Link
                      href={`/admin/machines/${machine.id}`}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {t.actions.open}
                    </Link>
                    {machine.isActive ? (
                      <ConfirmActionButton
                        action={setMachineActiveAction.bind(null, machine.id, false)}
                        confirmMessage={t.confirmDeactivate}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {t.actions.deactivate}
                      </ConfirmActionButton>
                    ) : (
                      <ConfirmActionButton
                        action={setMachineActiveAction.bind(null, machine.id, true)}
                        confirmMessage={t.confirmReactivate}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {t.actions.reactivate}
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

function StatusPill({ status }: { status: MachineStatus }) {
  const styles: Record<MachineStatus, string> = {
    IM_LAGER: "bg-green-100 text-green-800",
    AUSGELIEHEN: "bg-amber-100 text-amber-800",
    GESPERRT: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {uiTexts.machineStatus[status]}
    </span>
  );
}
