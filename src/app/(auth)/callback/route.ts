// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const sub = requestUrl.searchParams.get("sub"); // 👈 subdominio enviado en el register

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    // Usando el código, Supabase intercambia y establece la cookie de sesión
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Si vino un subdominio, redirigimos al club correspondiente
  if (sub) {
    const protocol = requestUrl.protocol; // "http:" o "https:"
    const hostname = requestUrl.hostname; // "localhost" o "app.versori-padel.com"

    let targetUrl: string;

    if (hostname === "localhost") {
      // Entorno local: sub.localhost:3000
      targetUrl = `${protocol}//${sub}.localhost:3000/`;
    } else {
      // Producción: sub + dominio base (sacamos los dos últimos segmentos)
      const parts = hostname.split(".");
      const baseDomain =
        parts.length > 2 ? parts.slice(-2).join(".") : hostname;
      // Ej: "app.versori-padel.com" -> "versori-padel.com"
      targetUrl = `${protocol}//${sub}.${baseDomain}/`;
    }

    return NextResponse.redirect(targetUrl);
  }

  // Fallback: si no hay sub, redirigimos al origen "central"
  return NextResponse.redirect(requestUrl.origin);
}
