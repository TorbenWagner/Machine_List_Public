import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonById } from "@/services/people/peopleService";
import { getAuditLogForEntity } from "@/services/audit/auditService";
import { PersonForm } from "@/components/admin/PersonForm";
import { updatePersonAction } from "../actions";
import { uiTexts } from "@/lib/ui-texts";
import { formatDateTimeDe } from "@/lib/format";
import { isServiceError } from "@/lib/serviceError";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PersonDetailPage({ params }: PageProps) {
  const { id } = await params;

  let person;
  try {
    person = await getPersonById(id);
  } catch (error) {
    if (isServiceError(error) && error.status === 404) notFound();
    throw error;
  }

  const auditEntries = await getAuditLogForEntity("PERSON", id);
  const t = uiTexts.admin.people;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/people" className="text-sm text-gray-500 hover:text-blue-600">
          ← {t.title}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">{person.displayName}</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <PersonForm
          action={updatePersonAction.bind(null, person.id)}
          mode="edit"
          defaultValues={{
            displayName: person.displayName,
            personType: person.personType,
            company: person.company,
            employeeNumber: person.employeeNumber,
            phone: person.phone,
            email: person.email,
            comment: person.comment,
          }}
        />
      </div>

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
