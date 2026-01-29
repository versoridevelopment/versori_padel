import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

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
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = req.nextUrl;

  // --- PROTECCIÓN RUTAS ADMIN ---
  if (url.pathname.startsWith("/admin")) {
    // 1. Si no hay usuario, login
    if (!user) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Si hay usuario, verificar Rol en BD
    const { data: rolesData } = await supabase
      .from("club_usuarios")
      .select("roles!inner(nombre)")
      .eq("id_usuario", user.id);

    const isAdmin = rolesData?.some((r: any) => r.roles?.nombre === "admin");

    if (!isAdmin) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/"; // Expulsar al home
      return NextResponse.redirect(redirectUrl);
    }
  }

  // --- LOGICA DE RECUPERACIÓN (Mantenida) ---
  const recoveryCookie = req.cookies.get("recovery_pending")?.value;
  if (recoveryCookie === "true") {
    if (!url.pathname.startsWith("/reset-password")) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/reset-password";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|api|videos|sponsors|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
