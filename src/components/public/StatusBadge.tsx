import type { MachineStatus } from "@/db/schema";
import { uiTexts } from "@/lib/ui-texts";

const STATUS_STYLES: Record<MachineStatus, string> = {
  IM_LAGER: "bg-green-100 text-green-800 border-green-300",
  AUSGELIEHEN: "bg-amber-100 text-amber-800 border-amber-300",
  GESPERRT: "bg-red-100 text-red-800 border-red-300",
};

export function StatusBadge({ status }: { status: MachineStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold ${STATUS_STYLES[status]}`}
    >
      {uiTexts.machineStatus[status]}
    </span>
  );
}
