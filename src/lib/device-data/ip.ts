/**
 * Ermittelt die Client-IP-Adresse aus den Request-Headern.
 *
 * WICHTIG: Diese Anwendung kann hinter einem Proxy oder Hostinganbieter
 * (z. B. Vercel, Supabase, nginx-Reverse-Proxy) betrieben werden. Der
 * "x-forwarded-for"-Header ist grundsaetzlich clientseitig faelschbar und
 * darf nur dann als vertrauenswuerdig behandelt werden, wenn die
 * Hostingumgebung sicherstellt, dass eingehende Verbindungen ausschliesslich
 * ueber den kontrollierten Proxy erfolgen koennen (der den Header setzt und
 * nicht durchreicht). In einer nicht kontrollierten Umgebung sollte dieser
 * Wert nur als Hinweis, nicht als rechtssicherer Nachweis, verstanden
 * werden - siehe README, Abschnitt "Geraete- und Zugriffsdaten".
 */
export function extractClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}
