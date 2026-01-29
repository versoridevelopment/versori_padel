import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Crear la respuesta base (Redirección al login o home)
  // Usamos 302 (Found) para evitar cacheados del navegador
  const response = NextResponse.redirect(new URL("/login", req.url), {
    status: 302,
  });

  // 2. Instanciar Supabase SSR
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // CORRECCIÓN CLAVE: Solo escribimos en response, nunca en req
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  try {
    // 3. Cerrar sesión en Supabase (Invalida token en servidor)
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error en supabase.auth.signOut:", error.message);
    }
  } catch (err) {
    console.error("Excepción al cerrar sesión:", err);
  }

  // 4. LIMPIEZA MANUAL DE SEGURIDAD (Nuclear Option)
  // Si por alguna razón signOut no limpió las cookies, lo hacemos nosotros.
  // Iteramos sobre todas las cookies y borramos las que parezcan de Supabase.
  const allCookies = req.cookies.getAll();
  allCookies.forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", {
        maxAge: 0,
        expires: new Date(0), // Fecha en el pasado
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  });

  return response;
}
