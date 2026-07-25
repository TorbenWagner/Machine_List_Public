import Link from "next/link";
import { notFound } from "next/navigation";
import { getMachineById } from "@/services/machines/machineService";
import { listActiveEmployees } from "@/services/people/peopleService";
import { getAuditLogForEntity } from "@/services/audit/auditService";
import { MachineForm } from "@/components/admin/MachineForm";
import { ConfirmActionButton } from "@/components/admin/ConfirmActionButton";
import { LockDialog } from "@/components/admin/LockDialog";
import { AdminCheckinDialog } from "@/components/admin/AdminCheckinDialog";
import { updateMachineAction, setMachineActiveAction, unlockMachineAction } from "../actions";
import { uiTexts } from "@/lib/ui-texts";
import { formatDateTimeDe } from "@/lib/format";
import { isServiceError } from "@/lib/serviceError";
import type { MachineStatus } from "@/db/schema";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MachineDetailPage({ params }: PageProps) {
  const { id } = await params;

  let machine;
  try {
    machine = await getMachineById(id);
  } catch (error) {
    if (isServiceError(error) && error.status === 404) notFound();
    throw error;
  }

  const [responsiblePeople, auditEntries] = await Promise.all([
    listActiveEmployees(),
    getAuditLogForEntity("MACHINE", id),
  ]);

  const t = uiTexts.admin.machines;
  const status = machine.status as MachineStatus;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/machines" className="text-sm text-gray-500 hover:text-blue-600">
            ← {t.title}
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{machine.name}</h1>
        </div>
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
          {uiTexts.machineStatus[status]}
        </span>
      </div>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Link
          href={`/admin/history?machineId=${machine.id}`}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          {t.actions.history}
        </Link>

        {status === "IM_LAGER" && (
          <LockDialog machineId={machine.id} currentInformationText={machine.informationText} />
        )}
        {status === "GESPERRT" && (
          <ConfirmActionButton
            action={unlockMachineAction.bind(null, machine.id)}
            confirmMessage={t.confirmUnlock}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {t.actions.unlock}
          </ConfirmActionButton>
        )}
        {status === "AUSGELIEHEN" && <AdminCheckinDialog machineId={machine.id} />}

        {machine.isActive ? (
          <ConfirmActionButton
            action={setMachineActiveAction.bind(null, machine.id, false)}
            confirmMessage={t.confirmDeactivate}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {t.actions.deactivate}
          </ConfirmActionButton>
        ) : (
          <ConfirmActionButton
            action={setMachineActiveAction.bind(null, machine.id, true)}
            confirmMessage={t.confirmReactivate}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {t.actions.reactivate}
          </ConfirmActionButton>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">{t.form.title}</h2>
        <MachineForm
          action={updateMachineAction.bind(null, machine.id)}
          responsiblePeople={responsiblePeople}
          mode="edit"
          defaultValues={{
            name: machine.name,
            manufacturer: machine.manufacturer,
            modelName: machine.modelName,
            serialNumber: machine.serialNumber,
            storageLocation: machine.storageLocation,
            ownershipType: machine.ownershipType,
            purchaseDate: machine.purchaseDate,
            hiltiScanCode: machine.hiltiScanCode,
            alternativeCode: machine.alternativeCode,
            description: machine.description,
            responsiblePersonId: machine.responsiblePersonId,
            informationText: machine.informationText,
            qrToken: machine.qrToken,
          }}
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {uiTexts.admin.qr.title}
        </h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/machines/${machine.id}/qr`}
            alt={`QR-Code für ${machine.name}`}
            width={200}
            height={200}
            className="h-[200px] w-[200px] rounded-lg border border-gray-200"
          />
          <div className="space-y-2 text-sm">
            <p className="text-gray-500">{machine.name}</p>
            <a
              href={`/api/admin/machines/${machine.id}/qr?download=1`}
              download
              className="inline-block rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-100"
            >
              {uiTexts.admin.qr.downloadButton}
            </a>
          </div>
        </div>
      </section>

      {auditEntries.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Audit-Log</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            {auditEntries.slice(0, 20).map((entry) => (
              <li key={entry.id} className="border-b border-gray-100 pb-2 last:border-0">
                <span className="font-medium text-gray-900">{entry.action}</span>{" "}
                {formatDateTimeDe(entry.createdAt)}
                {entry.adminUsername && ` · ${entry.adminUsername}`}
                {!entry.adminUsername && entry.databaseUser && ` · ${entry.databaseUser} (Datenbank)`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
