import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/adminAuth";
import { LoginForm } from "@/components/admin/LoginForm";
import { uiTexts } from "@/lib/ui-texts";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect("/admin/machines");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
        {uiTexts.admin.loginTitle}
      </h1>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <LoginForm />
      </div>
    </div>
  );
}
