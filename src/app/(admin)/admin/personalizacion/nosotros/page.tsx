import { supabase } from "@/lib/supabase/supabaseClient";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import NosotrosPageForm from "../../components/NosotrosPageForm";

export default async function AdminNosotrosPage() {
  const club = await getCurrentClub();
  if (!club) return <div>Cargando...</div>;

  const { data: nosotrosData } = await supabase
    .from("nosotros")
    .select("*")
    .eq("id_club", club.id_club)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 -m-6 md:-m-10">
      <div className="max-w-5xl mx-auto space-y-8 pb-32">
        <NosotrosPageForm clubId={club.id_club} initialData={nosotrosData} />
      </div>
    </div>
  );
}
