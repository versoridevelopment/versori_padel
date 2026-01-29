import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Buscamos el subdominio (tenant) en los params o lo inferimos del host
  const tenant = url.searchParams.get("tenant");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${url.origin}/auth/auth-code-error`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Esto sucede si el middleware ya respondió, 
            // en un GET de Route Handler es seguro ignorar si falla el set individual
          }
        },
      },
    }
  );

  // Intercambiamos el código por la sesión
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth error:", error.message);
    return NextResponse.redirect(`${url.origin}/auth/auth-code-error`);
  }

  // LÓGICA DE REDIRECCIÓN MULTI-TENANT
  const currentHost = request.headers.get("host") || "";
  
  // Si ya tenemos el tenant (ej: ferpadel), construimos la URL.
  // Si no viene en la URL, intentamos extraerlo del host actual.
  let targetOrigin = `https://${currentHost}`;

  if (tenant) {
    // Si tu dominio base es versorisports.com
    const baseDomain = currentHost.includes("versorisports.com") 
      ? "versorisports.com" 
      : currentHost.split('.').slice(-2).join('.');
    
    targetOrigin = `https://${tenant}.${baseDomain}`;
  }

  // Redirigir al home del club (o a la página 'next')
  return NextResponse.redirect(`${targetOrigin}${next}`);
}