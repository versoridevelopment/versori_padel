import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

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
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const url = req.nextUrl;

  // --- PROTECCIÓN RUTAS ADMIN ---
  if (url.pathname.startsWith("/admin")) {
    // 1. Si no hay usuario, fuera.
    if (!user) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Consultar Roles
    const { data: rolesData, error } = await supabase
      .from("club_usuarios")
      .select("roles!inner(nombre)")
      .eq("id_usuario", user.id);

    if (error) {
      // Por seguridad, si falla la BD, al home.
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }

    // 3. Aplanar array de roles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRoles =
      rolesData?.map((r: any) => r.roles?.nombre?.toLowerCase()) || [];

    // 🔴 4. LISTA BLANCA (WHITELIST)
    // IMPORTANTE: Aquí NO debe estar 'profe' ni 'cliente'
    const allowedRoles = ["admin", "cajero", "staff"];

    const hasAccess = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasAccess) {
      console.log(`⛔ Acceso denegado a ${user.email}. Roles: ${userRoles}`);
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/"; // Lo mandamos al inicio
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ... lógica recovery (sin cambios) ...
  const recoveryCookie = req.cookies.get("recovery_pending")?.value;
  if (
    recoveryCookie === "true" &&
    !url.pathname.startsWith("/reset-password")
  ) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = "/reset-password";
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|api|videos|sponsors|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
