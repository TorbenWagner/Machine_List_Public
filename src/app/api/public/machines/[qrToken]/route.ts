import { NextResponse, type NextRequest } from "next/server";
import { getPublicMachineView } from "@/services/machines/machineService";
import { handleApiError } from "@/lib/apiResponse";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ qrToken: string }> },
) {
  try {
    const { qrToken } = await params;
    const machine = await getPublicMachineView(qrToken);
    return NextResponse.json(machine);
  } catch (error) {
    return handleApiError(error);
  }
}
