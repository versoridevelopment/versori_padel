import { supabase } from "@/lib/supabase/supabaseClient";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import ClubForm from "./ClubForm";

export default async function ClubAdminPage() {
  // 1. Obtener el club actual
  const club = await getCurrentClub();

  if (!club) {
    return <div className="p-8 text-red-500">Error: Club no identificado.</div>;
  }

  // 2. Obtener datos del CLUB (Identidad + Marcas)
  const { data: clubData } = await supabase
    .from("clubes")
    .select("*")
    .eq("id_club", club.id_club)
    .single();

  // 3. Obtener datos de CONTACTO
  const { data: contactoData } = await supabase
    .from("contacto")
    .select(
      `
      activo_contacto_home,
      email, 
      usuario_instagram,
      direccion (calle, altura_calle, barrio),
      telefono (numero)
    `
    )
    .eq("id_club", club.id_club)
    .maybeSingle();

  // 4. Obtener datos de SOBRE NOSOTROS
  const { data: nosotrosData } = await supabase
    .from("nosotros")
    .select("*")
    .eq("id_club", club.id_club)
    .maybeSingle();

  // 5. Preparar los datos planos para el formulario principal
  const flattenedClubData = {
    // Identidad
    nombre: clubData?.nombre,
    subdominio: clubData?.subdominio,
    logo_url: clubData?.logo_url,
    imagen_hero_url: clubData?.imagen_hero_url,
    color_primario: clubData?.color_primario || "#3b82f6",
    color_secundario: clubData?.color_secundario || "#1f2937",
    color_texto: clubData?.color_texto || "#ffffff",

    // Textos Home
    texto_bienvenida_titulo:
      clubData?.texto_bienvenida_titulo || "EL MEJOR LUGAR PARA VIVIR EL PÁDEL",
    texto_bienvenida_subtitulo:
      clubData?.texto_bienvenida_subtitulo ||
      "Reserva tu cancha y únete a la comunidad.",

    // Marcas
    marcas: Array.isArray(clubData?.marcas) ? clubData!.marcas : [],

    // Contacto
    activo_contacto_home: contactoData?.activo_contacto_home ?? false, // ✅ FIX
    email: contactoData?.email || "",
    usuario_instagram: contactoData?.usuario_instagram || "",
    telefono: contactoData?.telefono?.[0]?.numero || "",
    calle: contactoData?.direccion?.[0]?.calle || "",
    altura: contactoData?.direccion?.[0]?.altura_calle || "",
    barrio: contactoData?.direccion?.[0]?.barrio || "",
  };

  // 6. Pasamos AMBOS conjuntos de datos al formulario
  return (
    <ClubForm
      initialData={flattenedClubData}
      nosotrosInitialData={nosotrosData}
      clubId={club.id_club}
    />
  );
}
