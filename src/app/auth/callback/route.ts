import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // "next" es a donde redirigir después de loguearse (por defecto al home)
  const next = searchParams.get("next") ?? "/";

  if (code) {
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
                cookieStore.set(name, value, options),
              );
            } catch {
              // El 'set' puede fallar en un Server Component, pero en un Route Handler
              // suele funcionar bien si se maneja la respuesta correctamente.
              // Sin embargo, para mayor seguridad en Route Handlers con @supabase/ssr,
              // el patrón ideal implica manipular la respuesta, pero este método
              // usando 'cookies()' de next/headers es válido en versiones recientes
              // para Route Handlers.
            }
          },
        },
      },
    );

    // Intercambiamos el código por la sesión y cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirigimos al origen + la ruta siguiente
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si hay error, redirigimos al login o página de error
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
