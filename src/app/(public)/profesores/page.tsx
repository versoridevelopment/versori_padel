import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { supabase } from "@/lib/supabase/supabaseClient";
import ProfesoresUI from "@/app/(public)/components/profesores/ProfesoresUI";
import { redirect } from "next/navigation"; // Importamos la función de redirección

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

  // 2. VERIFICACIÓN DE SEGURIDAD (NUEVO)
  // Consultamos si la sección está activa en la configuración del club
  const { data: clubConfig } = await supabase
    .from("clubes")
    .select("activo_profesores")
    .eq("id_club", club.id_club)
    .single();

  // Si la configuración existe y el campo es false, lo sacamos de aquí
  if (clubConfig && clubConfig.activo_profesores === false) {
    redirect("/");
  }

  // 3. Buscar profesores en la DB (Solo llega aquí si está activo)
  const { data: profesores } = await supabase
    .from("profesores")
    .select("*")
    .eq("id_club", club.id_club)
    .order("created_at", { ascending: true });

  // 4. Renderizar UI con datos reales
  return <ProfesoresUI profesores={profesores || []} />;
}
