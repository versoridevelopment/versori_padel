import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

// CORRECCIÓN CRÍTICA: El nombre debe coincidir con el de tu Storage en Supabase
const BUCKET_NAME = "public-media";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clubId = formData.get("clubId") as string;
    const settingsRaw = formData.get("settings") as string;

    // Archivos nuevos
    const pageGalleryFiles = formData.getAll("galleryFiles") as File[];
    const homeSliderFiles = formData.getAll("homeSliderFiles") as File[];
    const teamImageFile = formData.get("teamImageFile") as File | null;

    if (!clubId) {
      return NextResponse.json({ error: "Falta Club ID" }, { status: 400 });
    }

    const settings = JSON.parse(settingsRaw);
    const timestamp = Date.now();

    // ============================================================
    // A. SUBIDA DE IMÁGENES
    // ============================================================

    // 1. IMAGEN EQUIPO
    let finalTeamImageUrl = settings.equipo_imagen_url;
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

    // 2. PROCESAR GALERÍA PÁGINA INTERNA (Mezclar URLs existentes + Nuevas subidas)
    // El frontend nos envía 'settings.galeria_pagina' que es un array de URLs.
    // PERO las imágenes nuevas aún no tienen URL. El frontend las insertó visualmente,
    // pero aquí necesitamos reconstruir el array final en el ORDEN CORRECTO.
    // Estrategia: Subimos las nuevas primero y las añadimos al array final.

    // NOTA: Como el reordenamiento visual de "nuevas" vs "viejas" es complejo de sincronizar
    // exactamente igual sin lógica extra, haremos:
    // 1. Mantener las URLs viejas que vienen en settings.galeria_inicio.
    // 2. Añadir las nuevas al final (o principio según lógica).
    // Si quieres un ordenamiento mixto perfecto (vieja, nueva, vieja), se requiere una lógica
    // más compleja de IDs temporales. Por ahora, asumiremos [Viejas Ordenadas] + [Nuevas Ordenadas].

    const uploadedPageGalleryUrls: string[] = [];
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
      uploadedPageGalleryUrls.push(data.publicUrl);
    }

    // Concatenamos: Las que ya existían (y el usuario ordenó) + Las nuevas recién subidas
    const finalPageGallery = [
      ...(Array.isArray(settings.galeria_pagina)
        ? settings.galeria_pagina
        : []),
      ...uploadedPageGalleryUrls,
    ];

    // 3. PROCESAR SLIDER HOME
    const uploadedHomeSliderUrls: string[] = [];
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
      uploadedHomeSliderUrls.push(data.publicUrl);
    }

    const finalHomeSlider = [
      ...(Array.isArray(settings.galeria_inicio)
        ? settings.galeria_inicio
        : []),
      ...uploadedHomeSliderUrls,
    ];

    // ============================================================
    // B. ACTUALIZACIÓN DB
    // ============================================================

    const updatePayload = {
      id_club: parseInt(clubId),
      activo_nosotros: settings.activo_nosotros,

      // Página Interna
      historia_titulo: settings.historia_titulo,
      hero_descripcion: settings.hero_descripcion,
      historia_contenido: settings.historia_contenido,
      frase_cierre: settings.frase_cierre,
      galeria_pagina: finalPageGallery,

      // Home
      home_titulo: settings.home_titulo,
      home_descripcion: settings.home_descripcion,
      galeria_inicio: finalHomeSlider,

      // Otros
      equipo_imagen_url: finalTeamImageUrl,
      valores: settings.valores,
      recruitment_phone: settings.recruitment_phone,
      recruitment_message: settings.recruitment_message,

      updated_at: new Date().toISOString(),
    };

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
    return NextResponse.json(
      { error: error.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
