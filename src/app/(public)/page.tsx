import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { supabase } from "@/lib/supabase/supabaseClient";
import LandingClient from "./components/LandingClient";

// Revalidación en 0 para que los cambios del admin (colores, textos) se vean al instante
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

  // 1. Consultas Principales en paralelo para máxima velocidad
  const [clubRes, nosotrosRes, profesoresRes, contactoBaseRes] =
    await Promise.all([
      // Info del Club (Colores, Hero, Logo, etc.)
      supabase.from("clubes").select("*").eq("id_club", club.id_club).single(),

      // Configuración de Nosotros (Historia, Slider)
      supabase
        .from("nosotros")
        .select("*")
        .eq("id_club", club.id_club)
        .maybeSingle(),

      // Lista de Profesores
      supabase
        .from("profesores")
        .select("*")
        .eq("id_club", club.id_club)
        .order("created_at", { ascending: true }),

      // Info de Contacto Base
      supabase
        .from("contacto")
        .select("*")
        .eq("id_club", club.id_club)
        .maybeSingle(),
    ]);

  // 2. Consultas Secundarias (Detalles de contacto)
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

  // 3. Armado de Objetos
  const contactoCompleto = contactoBaseRes.data
    ? {
        ...contactoBaseRes.data,
        telefonos: telefonosData,
        direcciones: direccionesData,
      }
    : null;

  // Preparamos el objeto Landing con TODOS los datos del club mezclados
  // Esto es crucial para que el Hero reciba 'color_primario', 'imagen_hero_url', etc.
  const landingData = {
    club: {
      ...club, // Datos básicos del middleware (id, subdominio)
      ...clubRes.data, // Datos completos de la BD (sobrescribe lo básico)

      // Aseguramos valores por defecto para evitar fallos visuales
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
