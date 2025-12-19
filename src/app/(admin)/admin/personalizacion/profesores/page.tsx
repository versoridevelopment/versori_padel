import { supabase } from "@/lib/supabase/supabaseClient";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import ProfesoresClient from "./ProfesoresClient";

export default async function ProfesoresPage() {
  const club = await getCurrentClub();

  if (!club) {
    return <div className="p-8 text-red-500">Error: Club no identificado.</div>;
  }

  // Obtenemos la lista de profesores ordenada por creación
  const { data: profesores } = await supabase
    .from("profesores")
    .select("*")
    .eq("id_club", club.id_club)
    .order("created_at", { ascending: true });

  const clubColors = {
    primary: club.color_primario || "#3b82f6",
    text: club.color_texto || "#ffffff",
  };

  return (
    <ProfesoresClient
      initialData={profesores || []}
      clubId={club.id_club}
      subdominio={club.subdominio}
      //clubColors={clubColors}
    />
  );
}
