import { getPublicMachineView, type PublicMachineView as PublicMachineViewData } from "@/services/machines/machineService";
import { PublicMachineView } from "@/components/public/PublicMachineView";
import { isServiceError } from "@/lib/serviceError";
import { uiTexts } from "@/lib/ui-texts";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ qrToken: string }>;
}

async function loadMachine(qrToken: string): Promise<PublicMachineViewData | null> {
  try {
    return await getPublicMachineView(qrToken);
  } catch (error) {
    if (isServiceError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export default async function MachinePage({ params }: PageProps) {
  const { qrToken } = await params;
  const machine = await loadMachine(qrToken);

  if (!machine) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">{uiTexts.publicMachine.notFoundTitle}</h1>
        <p className="text-gray-600">{uiTexts.publicMachine.notFoundText}</p>
      </div>
    );
  }

  return (
    <PublicMachineView
      qrToken={qrToken}
      initialMachine={{
        ...machine,
        currentCheckoutAt: machine.currentCheckoutAt ? machine.currentCheckoutAt.toISOString() : null,
      }}
    />
  );
}
