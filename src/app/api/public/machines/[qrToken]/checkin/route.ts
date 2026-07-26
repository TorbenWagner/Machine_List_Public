import { NextResponse, type NextRequest } from "next/server";
import { publicCheckinSchema } from "@/lib/validation/transaction";
import { checkinMachine } from "@/services/transactions/transactionService";
import { collectDeviceContext } from "@/lib/device-data/collectDeviceContext";
import { handleApiError } from "@/lib/apiResponse";
import { getPublicMachineView } from "@/services/machines/machineService";
import { requirePublicAccessApi } from "@/lib/auth/publicAccess";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qrToken: string }> },
) {
  const gate = requirePublicAccessApi(request);
  if (gate) return gate;

  try {
    const { qrToken } = await params;
    const body = await request.json();
    const input = publicCheckinSchema.parse(body);
    const deviceContext = collectDeviceContext(request, input.deviceId);

    await checkinMachine({
      qrToken,
      personId: input.personId,
      comment: input.comment,
      ...deviceContext,
    });

    const machine = await getPublicMachineView(qrToken);
    return NextResponse.json(machine);
  } catch (error) {
    return handleApiError(error);
  }
}
