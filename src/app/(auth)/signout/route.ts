import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Crear respuesta JSON base
  const response = NextResponse.json({ success: true });

  // 2. Instanciar Supabase para manipular cookies
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
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // 3. Cerrar sesión oficial (Invalida token en servidor)
  await supabase.auth.signOut();

  // 4. LIMPIEZA NUCLEAR DE COOKIES
  // Forzamos el borrado de cualquier cookie de Supabase
  const allCookies = req.cookies.getAll();
  allCookies.forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set({
        name: cookie.name,
        value: "",
        maxAge: 0,
        expires: new Date(0),
        path: "/", // Importante: asegurar raíz
      });
    }
  });

  return response;
}
