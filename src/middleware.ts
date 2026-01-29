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
    console.log("🔒 [Middleware] Verificando acceso a /admin");

    if (!user) {
      console.log(
        "❌ [Middleware] No hay usuario logueado. Redirigiendo a login.",
      );
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    console.log(`👤 [Middleware] Usuario ID: ${user.id}`);

    // Consulta simplificada para depurar
    const { data: rolesData, error } = await supabase
      .from("club_usuarios")
      .select(
        `
        id_rol,
        roles ( nombre )
      `,
      )
      .eq("id_usuario", user.id);

    if (error) {
      console.error("❌ [Middleware] Error consultando roles:", error.message);
      // Si hay error de DB, mejor dejar pasar o redirigir a error, pero aquí redirigimos a home
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }

    // Aplanamos y normalizamos a minúsculas para evitar errores de tipeo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRoles =
      rolesData?.map((r: any) => r.roles?.nombre?.toLowerCase()) || [];

    console.log("📋 [Middleware] Roles encontrados:", userRoles);

    // Lista de roles permitidos (todo en minúsculas)
    const allowedRoles = ["admin", "cajero", "staff", "profe"];

    const hasAccess = userRoles.some((role) => allowedRoles.includes(role));

    if (hasAccess) {
      console.log("✅ [Middleware] Acceso CONCEDIDO.");
      return res;
    } else {
      console.log("⛔ [Middleware] Acceso DENEGADO. Redirigiendo a Home.");
      const redirectUrl = url.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ... lógica recovery ...
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
