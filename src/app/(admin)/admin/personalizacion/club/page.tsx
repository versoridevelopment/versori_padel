import { supabase } from "@/lib/supabase/supabaseClient";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import ClubForm from "./ClubForm";

export const revalidate = 0;

export default async function ClubAdminPage() {
  const club = await getCurrentClub();

  if (!club) {
    return <div className="p-8 text-red-500">Error: Club no identificado.</div>;
  }

  // Datos Club
  const { data: clubData } = await supabase
    .from("clubes")
    .select("*")
    .eq("id_club", club.id_club)
    .single();

  // Datos Contacto
  const { data: contactoData } = await supabase
    .from("contacto")
    .select("*")
    .eq("id_club", club.id_club)
    .maybeSingle();

  let telefonoData = null;
  let direccionData = null;

  if (contactoData) {
    // Teléfono
    const { data: tel } = await supabase
      .from("telefono")
      .select("numero")
      .eq("id_contacto", contactoData.id_contacto)
      .limit(1)
      .maybeSingle();
    telefonoData = tel;

    // Dirección
    const { data: dir } = await supabase
      .from("direccion")
      .select("calle, altura_calle, barrio") // Importante: traer los campos correctos
      .eq("id_contacto", contactoData.id_contacto)
      .limit(1)
      .maybeSingle();
    direccionData = dir;
  }

  const flattenedClubData = {
    // Identidad
    nombre: clubData?.nombre || "",
    subdominio: clubData?.subdominio || "",
    logo_url: clubData?.logo_url || null,
    imagen_hero_url: clubData?.imagen_hero_url || null,
    color_primario: clubData?.color_primario || "#3b82f6",
    color_secundario: clubData?.color_secundario || "#1f2937",
    color_texto: clubData?.color_texto || "#ffffff",

    // Home
    texto_bienvenida_titulo: clubData?.texto_bienvenida_titulo || "",
    texto_bienvenida_subtitulo: clubData?.texto_bienvenida_subtitulo || "",
    marcas: Array.isArray(clubData?.marcas) ? clubData!.marcas : [],

    // Contacto
    activo_contacto_home: contactoData?.activo_contacto_home ?? true,
    email: contactoData?.email || "",
    usuario_instagram: contactoData?.usuario_instagram || "",

    // Dirección y Teléfono
    telefono: telefonoData?.numero || "",
    calle: direccionData?.calle || "",
    // IMPORTANTE: Mapear 'altura_calle' de la DB a 'altura' del form
    altura: direccionData?.altura_calle || "",
    barrio: direccionData?.barrio || "",
  };

  return <ClubForm initialData={flattenedClubData} clubId={club.id_club} />;
}
