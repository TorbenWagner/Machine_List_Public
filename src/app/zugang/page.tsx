import { redirect } from "next/navigation";
import { hasPublicAccess } from "@/lib/auth/publicAccess";
import { PublicAccessForm } from "@/components/public/PublicAccessForm";
import { uiTexts } from "@/lib/ui-texts";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

function sanitizeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export default async function PublicAccessPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const nextPath = sanitizeNextPath(next);

  const granted = await hasPublicAccess();
  if (granted) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
        {uiTexts.publicAccess.title}
      </h1>
      <p className="mb-8 text-center text-sm text-gray-500">{uiTexts.publicAccess.description}</p>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <PublicAccessForm next={nextPath} />
      </div>
    </div>
  );
}
