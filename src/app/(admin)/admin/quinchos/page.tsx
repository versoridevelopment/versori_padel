import { supabase } from "@/lib/supabase/supabaseClient";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { Home } from "lucide-react";
import QuinchoForm from "./components/QuinchoForm";

export const revalidate = 0; // Para asegurar que siempre traiga datos frescos

export default async function AdminQuinchosPage() {
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="p-10 text-red-500">Error: No se identificó el club.</div>
    );
  }

  // 1. Obtener la configuración actual del quincho desde la DB
  const { data: quinchoData } = await supabase
    .from("quinchos")
    .select("*")
    .eq("id_club", club.id_club)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 -m-6 md:-m-10">
      <div className="max-w-6xl mx-auto space-y-8 pb-32">
        {/* Encabezado de la Página */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Home className="w-8 h-8 text-blue-600" />
            Gestión de Quincho / Eventos
          </h1>
          <p className="text-slate-500 text-lg">
            Configura la información, fotos y disponibilidad de tu salón de
            eventos.
          </p>
        </div>

        {/* Formulario (Cliente) */}
        <QuinchoForm clubId={club.id_club} initialData={quinchoData} />
      </div>
    </div>
  );
}
