import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { supabase } from "@/lib/supabase/supabaseClient";
import LandingClient from "./components/LandingClient";

export const revalidate = 0;

export default async function HomePage() {
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <h1 className="text-2xl">Club no encontrado</h1>
      </div>
    );
  }

  // 1. Consultas Principales (Club, Nosotros, Profesores, Contacto Base)
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
        .select("*") // Traemos solo la base del contacto primero
        .eq("id_club", club.id_club)
        .maybeSingle(),
    ]);

  // 2. Consultas Secundarias (Dependen del Contacto)
  // Si encontramos un contacto, buscamos sus teléfonos y direcciones por separado
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

  // 3. Armar el objeto final manualmente (A prueba de balas)
  const contactoCompleto = contactoBaseRes.data
    ? {
        ...contactoBaseRes.data,
        telefonos: telefonosData,
        direcciones: direccionesData,
      }
    : null;

  const landingData = {
    club: {
      nombre: clubRes.data?.nombre || club.nombre,
      subdominio: club.subdominio,
      color_primario: clubRes.data?.color_primario || "#3b82f6",
      color_secundario: clubRes.data?.color_secundario || "#0b0d12",
      logo_url: clubRes.data?.logo_url,
      imagen_hero_url: clubRes.data?.imagen_hero_url,
      texto_titulo: clubRes.data?.texto_bienvenida_titulo,
      texto_subtitulo: clubRes.data?.texto_bienvenida_subtitulo,
      marcas: clubRes.data?.marcas || [],
    },
    nosotros: nosotrosRes.data || null,
    profesores: profesoresRes.data || [],
    contacto: contactoCompleto,
  };

  return <LandingClient {...landingData} />;
}
