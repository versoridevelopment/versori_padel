import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin"; // Asegúrate de tener tu cliente admin configurado
// Si no tienes una constante para el bucket, usa "media" o el nombre de tu bucket público
const BUCKET_NAME = "media";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clubId = formData.get("clubId") as string;
    const settingsRaw = formData.get("settings") as string;

    // --- ARCHIVOS ---
    // 1. Galería de la Página Interna ("galeria_pagina")
    const pageGalleryFiles = formData.getAll("galleryFiles") as File[];

    // 2. Slider del Home ("galeria_inicio") - ¡Importante que el frontend use este nombre!
    const homeSliderFiles = formData.getAll("homeSliderFiles") as File[];

    // 3. Imagen del Equipo ("equipo_imagen_url")
    const teamImageFile = formData.get("teamImageFile") as File | null;

    if (!clubId) {
      return NextResponse.json({ error: "Falta Club ID" }, { status: 400 });
    }

    const settings = JSON.parse(settingsRaw);
    const timestamp = Date.now();

    // ============================================================
    // A. PROCESAMIENTO DE IMÁGENES
    // ============================================================

    // 1. IMAGEN EQUIPO (Reemplazo único)
    let finalTeamImageUrl = settings.equipo_imagen_url; // Mantiene la actual si no se sube nueva
    if (teamImageFile) {
      const fileExt = teamImageFile.name.split(".").pop();
      const path = `club_${clubId}/nosotros/team-${timestamp}.${fileExt}`;

      const arrayBuffer = await teamImageFile.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(path, new Uint8Array(arrayBuffer), {
          upsert: true,
          contentType: teamImageFile.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);
      finalTeamImageUrl = data.publicUrl;
    }

    // 2. GALERÍA PÁGINA INTERNA (Append: Viejas + Nuevas)
    // 'settings.galeria_pagina' ya trae las URLs viejas que el usuario NO borró en el front
    const finalPageGallery: string[] = Array.isArray(settings.galeria_pagina)
      ? settings.galeria_pagina
      : [];

    for (const file of pageGalleryFiles) {
      const fileExt = file.name.split(".").pop();
      const randomId = Math.random().toString(36).substring(7);
      const path = `club_${clubId}/nosotros/page-${timestamp}-${randomId}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(path, new Uint8Array(arrayBuffer), {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);
      finalPageGallery.push(data.publicUrl);
    }

    // 3. SLIDER HOME (Append: Viejas + Nuevas)
    const finalHomeSlider: string[] = Array.isArray(settings.galeria_inicio)
      ? settings.galeria_inicio
      : [];

    for (const file of homeSliderFiles) {
      const fileExt = file.name.split(".").pop();
      const randomId = Math.random().toString(36).substring(7);
      const path = `club_${clubId}/nosotros/home-${timestamp}-${randomId}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(path, new Uint8Array(arrayBuffer), {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);
      finalHomeSlider.push(data.publicUrl);
    }

    // ============================================================
    // B. ACTUALIZACIÓN EN BASE DE DATOS
    // ============================================================

    const updatePayload = {
      id_club: parseInt(clubId),
      activo_nosotros: settings.activo_nosotros,

      // Contenidos Página Interna
      historia_titulo: settings.historia_titulo,
      hero_descripcion: settings.hero_descripcion,
      historia_contenido: settings.historia_contenido,
      frase_cierre: settings.frase_cierre,
      galeria_pagina: finalPageGallery, // Array actualizado

      // Contenidos Home
      home_titulo: settings.home_titulo,
      home_descripcion: settings.home_descripcion,
      galeria_inicio: finalHomeSlider, // Array actualizado

      // Multimedia & Extras
      equipo_imagen_url: finalTeamImageUrl,
      valores: settings.valores, // JSONB
      recruitment_phone: settings.recruitment_phone,
      recruitment_message: settings.recruitment_message,

      updated_at: new Date().toISOString(),
    };

    // Usamos UPSERT para crear la fila si no existe, o actualizarla si existe el id_club
    const { error } = await supabaseAdmin
      .from("nosotros")
      .upsert(updatePayload, { onConflict: "id_club" });

    if (error) {
      console.error("Supabase Error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating nosotros page:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
