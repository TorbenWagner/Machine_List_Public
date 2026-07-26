import { describe, expect, it } from "vitest";
import {
  PUBLIC_ACCESS_COOKIE_NAME,
  PUBLIC_ACCESS_DURATION_MS,
  createPublicAccessToken,
} from "@/lib/auth/publicAccess";
import { verifySessionToken } from "@/lib/auth/session";

describe("Oeffentlicher Zugang - Token", () => {
  it("erzeugt ein Token, das sofort gueltig ist", () => {
    const token = createPublicAccessToken();
    expect(verifySessionToken(token)).not.toBeNull();
  });

  it("hat eine deutlich laengere Gueltigkeit als die Admin-Session (365 Tage)", () => {
    expect(PUBLIC_ACCESS_DURATION_MS).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it("lehnt ein manipuliertes Token ab", () => {
    const token = createPublicAccessToken();
    const tampered = token.slice(0, -2) + "xx";
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("lehnt ein abgelaufenes Token ab", () => {
    const originalNow = Date.now;
    Date.now = () => originalNow() - (PUBLIC_ACCESS_DURATION_MS + 1000 * 60);
    const token = createPublicAccessToken();
    Date.now = originalNow;

    expect(verifySessionToken(token)).toBeNull();
  });

  it("verwendet einen eigenen, vom Admin-Cookie getrennten Cookie-Namen", () => {
    expect(PUBLIC_ACCESS_COOKIE_NAME).toBe("machine_list_public_access");
    expect(PUBLIC_ACCESS_COOKIE_NAME).not.toBe("machine_list_admin_session");
  });
});
