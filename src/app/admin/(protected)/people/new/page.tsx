import { PersonForm } from "@/components/admin/PersonForm";
import { createPersonAction } from "../actions";
import { uiTexts } from "@/lib/ui-texts";

export default function NewPersonPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{uiTexts.admin.people.form.titleNew}</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <PersonForm action={createPersonAction} mode="create" />
      </div>
    </div>
  );
}
