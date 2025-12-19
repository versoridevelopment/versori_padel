import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { supabase } from "@/lib/supabase/supabaseClient";
import ProfesoresUI from "@/app/(public)/components/profesores/ProfesoresUI";

export const revalidate = 0; // Para que no cachee y muestre cambios al instante

export default async function ProfesoresPage() {
  // 1. Detectar club
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Club no encontrado
      </div>
    );
  }

  // 2. Buscar profesores en la DB
  const { data: profesores } = await supabase
    .from("profesores")
    .select("*")
    .eq("id_club", club.id_club)
    .order("created_at", { ascending: true });

  // 3. Renderizar UI con datos reales
  return <ProfesoresUI profesores={profesores || []} />;
}
