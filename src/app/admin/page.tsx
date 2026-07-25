import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/adminAuth";

export default async function AdminRootPage() {
  const admin = await getCurrentAdmin();
  redirect(admin ? "/admin/machines" : "/admin/login");
}
