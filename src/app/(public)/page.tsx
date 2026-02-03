import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { supabase } from "@/lib/supabase/supabaseClient";
import LandingClient from "./components/LandingClient";

export const revalidate = 0;

export default async function HomePage() {
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="min-h-screen bg-[#0b0d12] flex items-center justify-center text-white">
        Cargando...
      </div>
    );
  }

  // 1. Consulta optimizada con JOINs para traer todo el contacto de una vez
  // Traemos: contacto + direccion (hija) + telefono (hija)
  const { data: contactoFull } = await supabase
    .from("contacto")
    .select(
      `
      *,
      direccion (*),
      telefono (*)
    `,
    )
    .eq("id_club", club.id_club)
    .maybeSingle();

  // 2. Consultas paralelas para el resto
  const [clubRes, nosotrosRes, profesoresRes] = await Promise.all([
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
  ]);

  // 3. Preparar objeto de contacto para el componente
  // Mapeamos 'direccion' (singular de DB) a 'direcciones' (plural esperado por componente)
  const contactoAdaptado = contactoFull
    ? {
        ...contactoFull,
        direcciones: contactoFull.direccion || [], // Mapeo clave
        telefonos: contactoFull.telefono || [],
      }
    : null;

  // 4. Extraer teléfono principal para el Hero
  const whatsappPrincipal = contactoFull?.telefono?.[0]?.numero || null;

  const landingData = {
    club: {
      ...club,
      ...clubRes.data,
      color_primario: clubRes.data?.color_primario || "#3b82f6",
      color_secundario: clubRes.data?.color_secundario || "#0b0d12",
    },
    nosotros: nosotrosRes.data || null,
    profesores: profesoresRes.data || [],

    // Pasamos el contacto ya adaptado
    contacto: contactoAdaptado,

    // Datos directos
    whatsappHome: whatsappPrincipal,
    instagramUser: contactoFull?.usuario_instagram || null,
  };

  return (
    <>
      {/* ✅ SEO: H1 principal para Google (no visible) */}
      <h1 className="sr-only">{landingData.club.nombre}</h1>

      <LandingClient {...landingData} />
    </>
  );
}
