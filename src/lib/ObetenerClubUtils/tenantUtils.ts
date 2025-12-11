// src/lib/tenantUtils.ts

/**
 * Extrae el subdominio a partir de un hostname.
 * Ejemplos:
 *  - "padelcentral.localhost"  => "padelcentral"
 *  - "padelcentral.tudominio.com" => "padelcentral"
 *  - "localhost" o "www.tudominio.com" => null
 */
export function getSubdomainFromHost(hostname: string): string | null {
  const parts = hostname.split(".");

  // Desarrollo: algo.localhost
  if (hostname.endsWith("localhost")) {
    if (parts.length === 2 && parts[0] !== "localhost") {
      return parts[0];
    }
    return null;
  }

  // Producción: sub.dominio.com
  if (parts.length > 2 && parts[0] !== "www") {
    return parts[0];
  }

  return null;
}
