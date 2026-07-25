import { NextResponse, type NextRequest } from "next/server";
import { publicCheckoutSchema } from "@/lib/validation/transaction";
import { checkoutMachine } from "@/services/transactions/transactionService";
import { collectDeviceContext } from "@/lib/device-data/collectDeviceContext";
import { handleApiError } from "@/lib/apiResponse";
import { getPublicMachineView } from "@/services/machines/machineService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qrToken: string }> },
) {
  try {
    const { qrToken } = await params;
    const body = await request.json();
    const input = publicCheckoutSchema.parse(body);
    const deviceContext = collectDeviceContext(request, input.deviceId);

    await checkoutMachine({
      qrToken,
      personId: input.personId,
      projectOrLocation: input.projectOrLocation,
      plannedReturnDate: input.plannedReturnDate,
      comment: input.comment,
      ...deviceContext,
    });

    const machine = await getPublicMachineView(qrToken);
    return NextResponse.json(machine);
  } catch (error) {
    return handleApiError(error);
  }
}
