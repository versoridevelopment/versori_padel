import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Siempre partimos de NextResponse.next()
  const res = NextResponse.next();

  // Supabase SSR client en middleware (cookies read/write)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Leer cookies desde el request
        getAll() {
          return req.cookies.getAll();
        },
        // Escribir cookies en la response
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresca sesión (si hace falta, setea cookies actualizadas)
  // En middleware conviene getUser() o getSession(); getUser() fuerza validación.
  await supabase.auth.getUser();

  // --- TU LÓGICA DE BLOQUEO (igual que antes) ---
  const recoveryCookie = req.cookies.get("recovery_pending")?.value;

  if (recoveryCookie === "true") {
    if (!req.nextUrl.pathname.startsWith("/reset-password")) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/reset-password";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|videos|sponsors|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
