import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import "../../globals.css";
import { Sidebar } from "./components/Sidebar";

export const metadata = {
  title: "Panel Admin | Versori",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          } catch {}
        },
      },
    },
  );

  // 1. Verificar Sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Verificar Roles en Base de Datos
  const { data: rolesData } = await supabase
    .from("club_usuarios")
    .select("roles!inner(nombre)")
    .eq("id_usuario", user.id);

  // 🔴 3. LISTA BLANCA (WHITELIST) - Sincronizada con el Middleware
  // Solo estos pueden ver el layout del admin.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasAccess = rolesData?.some((r: any) =>
    ["admin", "cajero", "staff"].includes(r.roles?.nombre),
  );

  // 4. Expulsión
  if (!hasAccess) {
    redirect("/");
  }

  return (
    <html lang="es">
      <body className="bg-gray-50">
        <div className="flex h-screen text-gray-900">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
