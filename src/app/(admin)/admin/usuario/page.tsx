import UserProfileForm from "./UserProfileForm";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProfileData = {
  id_usuario: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  apodo?: string | null;
  bio?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
};

export default async function Page() {
  // ✅ Auth (server)
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">No autenticado</p>
          <p className="text-neutral-400 text-sm">
            Iniciá sesión para ver tu perfil.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Perfil desde DB (server)
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("id_usuario,nombre,apellido,telefono,apodo,bio,fecha_nacimiento,genero")
    .eq("id_usuario", user.id)
    .maybeSingle();

  const initialData = (profErr ? null : (profile as ProfileData | null)) ?? null;
  const email = user.email ?? "";

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <UserProfileForm initialData={initialData} email={email} userId={user.id} />
      </div>
    </div>
  );
}
