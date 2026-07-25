import { UAParser } from "ua-parser-js";

export interface ParsedDeviceInfo {
  browser: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
}

/**
 * Leitet Browser, Betriebssystem und Geraetetyp aus dem User-Agent-Header
 * ab. Dient ausschliesslich der internen Nachvollziehbarkeit von
 * Geraete- und Zugriffsdaten, kein Fingerprinting.
 */
export function parseUserAgent(userAgent: string | null | undefined): ParsedDeviceInfo {
  if (!userAgent) {
    return { browser: null, operatingSystem: null, deviceType: null };
  }

  const result = UAParser(userAgent);

  const browser = result.browser.name
    ? [result.browser.name, result.browser.version].filter(Boolean).join(" ")
    : null;
  const operatingSystem = result.os.name
    ? [result.os.name, result.os.version].filter(Boolean).join(" ")
    : null;
  const deviceType = result.device.type ?? "desktop";

  return { browser, operatingSystem, deviceType };
}
