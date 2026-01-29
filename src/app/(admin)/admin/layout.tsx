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

  // 1. Instanciar Supabase Server Client
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
            // El layout es Server Component, no puede setear cookies a veces,
            // pero el middleware ya se encargó de refrescar la sesión.
          }
        },
      },
    },
  );

  // 2. Verificar Sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 3. Verificar ROL en Base de Datos (Seguridad Real)
  // Buscamos si existe una relación en club_usuarios con el rol 'admin'
  const { data: rolesData } = await supabase
    .from("club_usuarios")
    .select(
      `
      roles!inner ( nombre )
    `,
    )
    .eq("id_usuario", user.id);

  const isAdmin = rolesData?.some((r: any) => r.roles?.nombre === "admin");

  // 4. Si no es admin, lo expulsamos al Home
  if (!isAdmin) {
    redirect("/");
  }

  // 5. Renderizar Panel
  return (
    <html lang="es">
      <body className="bg-gray-50">
        <div className="flex h-screen text-gray-900">
          {/* Sidebar Cliente */}
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
