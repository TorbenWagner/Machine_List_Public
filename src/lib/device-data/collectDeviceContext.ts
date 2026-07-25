import { extractClientIp } from "./ip";
import { parseUserAgent } from "./parseUserAgent";
import type { DeviceContext } from "@/services/transactions/transactionService";

/** Sammelt serverseitig erfassbare Geraete- und Zugriffsdaten fuer einen Request. */
export function collectDeviceContext(request: Request, deviceId?: string): DeviceContext {
  const userAgent = request.headers.get("user-agent");
  const { browser, operatingSystem, deviceType } = parseUserAgent(userAgent);

  return {
    deviceId: deviceId ?? null,
    ipAddress: extractClientIp(request.headers),
    userAgent,
    browser,
    operatingSystem,
    deviceType,
  };
}
