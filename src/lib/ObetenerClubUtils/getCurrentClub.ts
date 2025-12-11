// src/lib/getCurrentClub.ts
import { headers } from "next/headers";
import { getSubdomainFromHost } from "./tenantUtils";
import { getClubBySubdomain, Club } from "./getClubBySubdomain";

export type { Club } from "./getClubBySubdomain";

/**
 * Obtiene el club actual en un Server Component
 * usando el subdominio del host de la request.
 */
export async function getCurrentClub(): Promise<Club | null> {
  const headersList = await headers();
  const host = headersList.get("host") ?? ""; // ej: "padelcentral.localhost:3000"
  const hostname = host.split(":")[0]; // "padelcentral.localhost"

  const subdomain = getSubdomainFromHost(hostname);

  console.log("[getCurrentClub] host:", hostname, "subdomain:", subdomain);

  if (!subdomain) return null;

  const club = await getClubBySubdomain(subdomain);

  console.log("[getCurrentClub] club encontrado:", club);

  return club;
}
