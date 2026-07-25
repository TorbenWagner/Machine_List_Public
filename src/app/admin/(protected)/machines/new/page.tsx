import { listActiveEmployees } from "@/services/people/peopleService";
import { MachineForm } from "@/components/admin/MachineForm";
import { createMachineAction } from "../actions";
import { uiTexts } from "@/lib/ui-texts";

export default async function NewMachinePage() {
  const responsiblePeople = await listActiveEmployees();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{uiTexts.admin.machines.form.titleNew}</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <MachineForm action={createMachineAction} responsiblePeople={responsiblePeople} mode="create" />
      </div>
    </div>
  );
}
