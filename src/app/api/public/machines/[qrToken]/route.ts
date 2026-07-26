import { NextResponse, type NextRequest } from "next/server";
import { getPublicMachineView } from "@/services/machines/machineService";
import { handleApiError } from "@/lib/apiResponse";
import { requirePublicAccessApi } from "@/lib/auth/publicAccess";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrToken: string }> },
) {
  const gate = requirePublicAccessApi(request);
  if (gate) return gate;

  try {
    const { qrToken } = await params;
    const machine = await getPublicMachineView(qrToken);
    return NextResponse.json(machine);
  } catch (error) {
    return handleApiError(error);
  }
}
