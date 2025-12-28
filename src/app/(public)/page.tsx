import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { supabase } from "@/lib/supabase/supabaseClient";
import LandingClient from "./components/LandingClient";

export const revalidate = 0;

export default async function HomePage() {
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="min-h-screen bg-[#0b0d12] flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Club no encontrado</h1>
      </div>
    );
  }

  // 1. Consultas Principales
  const [clubRes, nosotrosRes, profesoresRes, contactoBaseRes] =
    await Promise.all([
      supabase.from("clubes").select("*").eq("id_club", club.id_club).single(),
      supabase
        .from("nosotros")
        .select("*")
        .eq("id_club", club.id_club)
        .maybeSingle(),
      supabase
        .from("profesores")
        .select("*")
        .eq("id_club", club.id_club)
        .order("created_at", { ascending: true }),
      supabase
        .from("contacto")
        .select("*")
        .eq("id_club", club.id_club)
        .maybeSingle(),
    ]);

  // 2. Consultas Secundarias
  let telefonosData: any[] = [];
  let direccionesData: any[] = [];

  if (contactoBaseRes.data) {
    const idContacto = contactoBaseRes.data.id_contacto;
    const [telRes, dirRes] = await Promise.all([
      supabase.from("telefono").select("numero").eq("id_contacto", idContacto),
      supabase.from("direccion").select("*").eq("id_contacto", idContacto),
    ]);
    telefonosData = telRes.data || [];
    direccionesData = dirRes.data || [];
  }

  const contactoCompleto = contactoBaseRes.data
    ? {
        ...contactoBaseRes.data,
        telefonos: telefonosData,
        direcciones: direccionesData,
      }
    : null;

  // 3. Armado de objeto LandingData
  const landingData = {
    club: {
      ...club,
      ...clubRes.data,
      // Aseguramos que el campo activo_profesores esté presente (default true)
      activo_profesores: clubRes.data?.activo_profesores ?? true,

      color_primario: clubRes.data?.color_primario || "#3b82f6",
      color_secundario: clubRes.data?.color_secundario || "#0b0d12",
      marcas: clubRes.data?.marcas || [],
    },
    nosotros: nosotrosRes.data || null,
    profesores: profesoresRes.data || [],
    contacto: contactoCompleto,
  };

  return <LandingClient {...landingData} />;
}
