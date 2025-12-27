import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { PUBLIC_MEDIA_BUCKET } from "@/lib/storage/paths";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clubId = formData.get("clubId") as string;
    const settingsRaw = formData.get("settings") as string;

    // Archivos
    const galleryFiles = formData.getAll("galleryFiles") as File[];
    const teamImageFile = formData.get("teamImageFile") as File | null;

    if (!clubId)
      return NextResponse.json({ error: "Falta Club ID" }, { status: 400 });

    const settings = JSON.parse(settingsRaw);

    // --- 1. Subida de Imagen de Equipo (Si hay nueva) ---
    let finalTeamImageUrl = settings.equipo_imagen_url;

    if (teamImageFile) {
      const path = `club_${clubId}/nosotros/team-${Date.now()}.${teamImageFile.name
        .split(".")
        .pop()}`;
      const arrayBuffer = await teamImageFile.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(PUBLIC_MEDIA_BUCKET)
        .upload(path, new Uint8Array(arrayBuffer), {
          upsert: true,
          contentType: teamImageFile.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage
        .from(PUBLIC_MEDIA_BUCKET)
        .getPublicUrl(path);
      finalTeamImageUrl = data.publicUrl;
    }

    // --- 2. Subida de Galería (Múltiple) ---
    // Empezamos con las imágenes que ya existían
    const finalGalleryUrls: string[] = settings.galeria_pagina || [];

    for (const file of galleryFiles) {
      const path = `club_${clubId}/nosotros/page-slider-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${file.name.split(".").pop()}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(PUBLIC_MEDIA_BUCKET)
        .upload(path, new Uint8Array(arrayBuffer), {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage
        .from(PUBLIC_MEDIA_BUCKET)
        .getPublicUrl(path);
      finalGalleryUrls.push(data.publicUrl);
    }

    // --- 3. Actualizar Base de Datos ---
    const { error } = await supabaseAdmin.from("nosotros").upsert(
      {
        id_club: clubId,
        activo_nosotros: settings.activo_nosotros,

        // Contenido General
        historia_titulo: settings.historia_titulo,
        hero_descripcion: settings.hero_descripcion,
        historia_contenido: settings.historia_contenido,
        frase_cierre: settings.frase_cierre,

        // Media
        galeria_pagina: finalGalleryUrls,
        equipo_imagen_url: finalTeamImageUrl,

        // Estructuras Complejas (JSONB)
        valores: settings.valores, // Array de objetos {titulo, contenido}

        // Contacto Reclutamiento
        recruitment_phone: settings.recruitment_phone,
        recruitment_message: settings.recruitment_message,
      },
      { onConflict: "id_club" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating nosotros page:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
