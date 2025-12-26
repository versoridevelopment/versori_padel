import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { PUBLIC_MEDIA_BUCKET } from "@/lib/storage/paths";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const clubId = formData.get("clubId") as string;
    const settingsRaw = formData.get("settings") as string;

    // Obtenemos todos los archivos con el nombre 'galleryFiles'
    const imageFiles = formData.getAll("galleryFiles") as File[];

    if (!clubId)
      return NextResponse.json({ error: "Falta Club ID" }, { status: 400 });

    const settings = JSON.parse(settingsRaw);

    // Comenzamos con las imágenes que ya existían (que el usuario no borró en el front)
    const finalGalleryUrls: string[] = settings.galeria || [];

    // Subir nuevas imágenes
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const path = `club_${clubId}/quinchos/gallery-${Date.now()}-${Math.random()
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
    }

    // Actualizar DB con el array de strings
    const { error } = await supabaseAdmin.from("quinchos").upsert(
      {
        id_club: clubId,
        activo: settings.activo,
        titulo: settings.titulo,
        descripcion: settings.descripcion,
        precio: settings.precio,
        galeria: finalGalleryUrls, // Guardamos el array
        whatsapp_numero: settings.whatsapp_numero,
        whatsapp_mensaje: settings.whatsapp_mensaje,
      },
      { onConflict: "id_club" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true, galeria: finalGalleryUrls });
  } catch (error: any) {
    console.error("Error updating quincho:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
