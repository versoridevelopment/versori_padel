import { supabase } from "@/lib/supabase/supabaseClient";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import ClubForm from "./ClubForm";

export default async function ClubAdminPage() {
  // 1. Obtener el club actual
  const club = await getCurrentClub();

  if (!club) {
    return <div className="p-8 text-red-500">Error: Club no identificado.</div>;
  }

  // 2. Obtener datos del CLUB (incluyendo los nuevos campos de estilo y marcas)
  const { data: clubData } = await supabase
    .from("clubes")
    .select("*")
    .eq("id_club", club.id_club)
    .single();

  // 3. Obtener datos de CONTACTO (Unión con Dirección y Teléfono)
  const { data: contactoData } = await supabase
    .from("contacto")
    .select(
      `
      email, 
      usuario_instagram,
      direccion (calle, altura_calle, barrio),
      telefono (numero)
    `
    )
    .eq("id_club", club.id_club)
    .maybeSingle();

  // 4. Preparar los datos planos para el formulario (ClubForm)
  const flattenedData = {
    // Identidad
    nombre: clubData.nombre,
    subdominio: clubData.subdominio,
    logo_url: clubData.logo_url,
    imagen_hero_url: clubData.imagen_hero_url,
    color_primario: clubData.color_primario || "#3b82f6",
    color_secundario: clubData.color_secundario || "#1f2937",
    color_texto: clubData.color_texto || "#ffffff",

    // Textos
    texto_bienvenida_titulo:
      clubData.texto_bienvenida_titulo || "EL MEJOR LUGAR PARA VIVIR EL PÁDEL",
    texto_bienvenida_subtitulo:
      clubData.texto_bienvenida_subtitulo ||
      "Reserva tu cancha y únete a la comunidad.",

    // Marcas (Aseguramos que sea un array)
    marcas: Array.isArray(clubData.marcas) ? clubData.marcas : [],

    // Contacto (Datos planos)
    email: contactoData?.email || "",
    usuario_instagram: contactoData?.usuario_instagram || "",
    telefono: contactoData?.telefono?.[0]?.numero || "",
    calle: contactoData?.direccion?.[0]?.calle || "",
    altura: contactoData?.direccion?.[0]?.altura_calle || "",
    barrio: contactoData?.direccion?.[0]?.barrio || "",
  };

  // 5. Renderizar el FORMULARIO (No el LandingClient)
  return <ClubForm initialData={flattenedData} clubId={club.id_club} />;
}
