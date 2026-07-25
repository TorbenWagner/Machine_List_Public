import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { requireAdminApi } from "@/lib/auth/adminAuth";
import { getMachineById } from "@/services/machines/machineService";
import { handleApiError } from "@/lib/apiResponse";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "maschine";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, response } = await requireAdminApi();
  if (!admin) return response;

  try {
    const { id } = await params;
    const machine = await getMachineById(id);

    const baseUrl = process.env.PUBLIC_BASE_URL;
    if (!baseUrl) {
      throw new Error("PUBLIC_BASE_URL ist nicht konfiguriert.");
    }
    const targetUrl = `${baseUrl.replace(/\/$/, "")}/m/${machine.qrToken}`;

    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      type: "png",
      width: 600,
      margin: 2,
    });

    const download = request.nextUrl.searchParams.get("download") === "1";
    const headers = new Headers({ "Content-Type": "image/png" });
    if (download) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="qr-${sanitizeFilename(machine.name)}.png"`,
      );
    }

    return new NextResponse(new Uint8Array(pngBuffer), { headers });
  } catch (error) {
    return handleApiError(error);
  }
}
