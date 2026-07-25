import Link from "next/link";
import { uiTexts } from "@/lib/ui-texts";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{uiTexts.common.appName}</h1>
      <p className="text-gray-600">
        Maschinen werden über den individuellen QR-Code am Gerät geöffnet. Eine
        öffentliche Übersicht aller Maschinen gibt es aus Datenschutzgründen nicht.
      </p>
      <Link
        href="/admin/login"
        className="mt-4 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Zur Administration
      </Link>
    </main>
  );
}
