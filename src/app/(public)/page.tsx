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

  const [nosotrosRes, profesoresRes, contactoRes, clubRes] = await Promise.all([
    // A) Tabla NOSOTROS
    supabase
      .from("nosotros")
      .select(
        "hero_descripcion, historia_titulo, historia_contenido, historia_imagen_url, valores, frase_cierre"
      )
      .eq("id_club", club.id_club)
      .single(),

    // B) Tabla PROFESORES
    supabase
      .from("profesores")
      .select("*")
      .eq("id_club", club.id_club)
      .order("created_at", { ascending: true }),

    // C) Tabla CONTACTO
    supabase
      .from("contacto")
      .select(
        `
        email, 
        instagram_url, 
        usuario_instagram,
        telefonos:telefono(numero),
        direcciones:direccion(calle, altura_calle, barrio, ciudad, latitud, longitud)
      `
      )
      .eq("id_club", club.id_club)
      .single(),

    // D) Tabla CLUBES (Datos completos de identidad)
    supabase
      .from("clubes")
      .select(
        `
        logo_url, 
        imagen_hero_url, 
        color_primario, 
        color_secundario, 
        nombre,
        texto_bienvenida_titulo,
        texto_bienvenida_subtitulo,
        marcas
      `
      )
      .eq("id_club", club.id_club)
      .single(),
  ]);

  // Mapeo de datos para cumplir con la interfaz de LandingProps
  const landingData = {
    club: {
      nombre: clubRes.data?.nombre || club.nombre,
      subdominio: club.subdominio,
      color_primario: clubRes.data?.color_primario || "#3b82f6",
      // Agregamos los campos que faltaban:
      color_secundario: clubRes.data?.color_secundario || "#0b0d12",
      logo_url: clubRes.data?.logo_url,
      imagen_hero_url: clubRes.data?.imagen_hero_url,
      texto_titulo: clubRes.data?.texto_bienvenida_titulo,
      texto_subtitulo: clubRes.data?.texto_bienvenida_subtitulo,
      marcas: clubRes.data?.marcas || [], // Array de marcas
    },
    nosotros: nosotrosRes.data || null,
    profesores: profesoresRes.data || [],
    contacto: contactoRes.data || null,
  };

  return <LandingClient {...landingData} />;
}
