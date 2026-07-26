import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resetAndSeed } from "./testDb";
import { GET as getMachine } from "@/app/api/public/machines/[qrToken]/route";
import { GET as getPeople } from "@/app/api/public/machines/[qrToken]/people/route";
import { POST as postCheckout } from "@/app/api/public/machines/[qrToken]/checkout/route";
import { POST as postCheckin } from "@/app/api/public/machines/[qrToken]/checkin/route";
import { PUBLIC_ACCESS_COOKIE_NAME, createPublicAccessToken } from "@/lib/auth/publicAccess";
import type { SeedResult } from "@/db/seed/seedDatabase";

let seed: SeedResult;

beforeEach(async () => {
  seed = await resetAndSeed();
});

/** Cookie-Header mit gueltigem oeffentlichem Zugangs-Token fuer Testanfragen. */
function accessCookieHeader(): string {
  return `${PUBLIC_ACCESS_COOKIE_NAME}=${createPublicAccessToken()}`;
}

function publicRequest(url: string) {
  return new NextRequest(url, { headers: { cookie: accessCookieHeader() } });
}

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", cookie: accessCookieHeader() },
  });
}

describe("Öffentliche API - Sicherheit", () => {
  it("GET /api/public/machines/[qrToken] gibt nur öffentlich zulässige Felder zurück", async () => {
    const machine = seed.machines.inStorage[0];
    const response = await getMachine(publicRequest(`http://localhost/api/public/machines/${machine.qrToken}`), {
      params: Promise.resolve({ qrToken: machine.qrToken }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();

    const forbiddenKeys = [
      "id",
      "qrToken",
      "serialNumber",
      "purchaseDate",
      "ownershipType",
      "hiltiScanCode",
      "alternativeCode",
      "responsiblePersonId",
      "createdAt",
      "updatedAt",
    ];
    for (const key of forbiddenKeys) {
      expect(body).not.toHaveProperty(key);
    }
    expect(body).toMatchObject({ name: machine.name, status: "IM_LAGER" });
  });

  it("GET /api/public/machines/[qrToken] liefert bei unbekanntem Token eine neutrale 404-Fehlermeldung", async () => {
    const response = await getMachine(publicRequest("http://localhost/api/public/machines/unknown-token"), {
      params: Promise.resolve({ qrToken: "unknown-token" }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/stack|at Object|node_modules/i);
  });

  it("GET .../people gibt nur id, displayName, company, personType zurück und keine inaktiven Personen", async () => {
    const response = await getPeople(publicRequest("http://localhost/api/public/machines/token/people"));
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    for (const person of body) {
      expect(Object.keys(person).sort()).toEqual(["company", "displayName", "id", "personType"].sort());
    }
    const ids = body.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(seed.inactivePerson.id);
  });

  it("POST checkout lehnt fehlende personId serverseitig ab (400, keine Stacktrace)", async () => {
    const machine = seed.machines.inStorage[0];
    const response = await postCheckout(jsonRequest(`http://localhost/api/public/machines/${machine.qrToken}/checkout`, {}), {
      params: Promise.resolve({ qrToken: machine.qrToken }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/node_modules|at async|\.ts:\d+/);
  });

  it("POST checkout lehnt manipulierte (nicht existierende) personId serverseitig ab", async () => {
    const machine = seed.machines.inStorage[0];
    const response = await postCheckout(
      jsonRequest(`http://localhost/api/public/machines/${machine.qrToken}/checkout`, {
        personId: "00000000-0000-0000-0000-000000000000",
      }),
      { params: Promise.resolve({ qrToken: machine.qrToken }) },
    );
    expect(response.status).toBe(400);
  });

  it("POST checkout und checkin funktionieren End-to-End über die Route Handler", async () => {
    const machine = seed.machines.inStorage[0];
    const person = seed.employees[0];

    const checkoutResponse = await postCheckout(
      jsonRequest(`http://localhost/api/public/machines/${machine.qrToken}/checkout`, { personId: person.id }),
      { params: Promise.resolve({ qrToken: machine.qrToken }) },
    );
    expect(checkoutResponse.status).toBe(200);
    const afterCheckout = await checkoutResponse.json();
    expect(afterCheckout.status).toBe("AUSGELIEHEN");

    const checkinResponse = await postCheckin(
      jsonRequest(`http://localhost/api/public/machines/${machine.qrToken}/checkin`, { personId: person.id }),
      { params: Promise.resolve({ qrToken: machine.qrToken }) },
    );
    expect(checkinResponse.status).toBe(200);
    const afterCheckin = await checkinResponse.json();
    expect(afterCheckin.status).toBe("IM_LAGER");
  });

  it("lehnt GET /api/public/machines/[qrToken] ohne Zugangs-Cookie mit 401 ab", async () => {
    const machine = seed.machines.inStorage[0];
    const response = await getMachine(new NextRequest(`http://localhost/api/public/machines/${machine.qrToken}`), {
      params: Promise.resolve({ qrToken: machine.qrToken }),
    });
    expect(response.status).toBe(401);
  });

  it("lehnt GET .../people ohne Zugangs-Cookie mit 401 ab", async () => {
    const response = await getPeople(new NextRequest("http://localhost/api/public/machines/token/people"));
    expect(response.status).toBe(401);
  });

  it("lehnt POST checkout ohne Zugangs-Cookie mit 401 ab", async () => {
    const machine = seed.machines.inStorage[0];
    const response = await postCheckout(
      new NextRequest(`http://localhost/api/public/machines/${machine.qrToken}/checkout`, {
        method: "POST",
        body: JSON.stringify({ personId: seed.employees[0].id }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ qrToken: machine.qrToken }) },
    );
    expect(response.status).toBe(401);
  });

  it("lehnt ein manipuliertes/ungültiges Zugangs-Cookie mit 401 ab", async () => {
    const machine = seed.machines.inStorage[0];
    const response = await getMachine(
      new NextRequest(`http://localhost/api/public/machines/${machine.qrToken}`, {
        headers: { cookie: `${PUBLIC_ACCESS_COOKIE_NAME}=manipulierter-wert` },
      }),
      { params: Promise.resolve({ qrToken: machine.qrToken }) },
    );
    expect(response.status).toBe(401);
  });
});
