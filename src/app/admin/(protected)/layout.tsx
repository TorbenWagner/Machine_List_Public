import Link from "next/link";
import { requireAdmin } from "@/lib/auth/adminAuth";
import { uiTexts } from "@/lib/ui-texts";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-lg font-bold text-gray-900">{uiTexts.common.appName}</span>
            <nav className="flex gap-4 text-sm font-medium text-gray-600">
              <Link href="/admin/machines" className="hover:text-blue-600">
                {uiTexts.admin.nav.machines}
              </Link>
              <Link href="/admin/people" className="hover:text-blue-600">
                {uiTexts.admin.nav.people}
              </Link>
              <Link href="/admin/history" className="hover:text-blue-600">
                {uiTexts.admin.nav.history}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{admin.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
