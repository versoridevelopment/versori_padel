import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { PUBLIC_MEDIA_BUCKET } from "@/lib/storage/paths";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const clubId = formData.get("clubId") as string;
    const settingsRaw = formData.get("settings") as string;
    const galleryOrderRaw = formData.get("galleryOrder") as string; // Nueva estructura de orden

    // Archivos físicos
    const imageFiles = formData.getAll("galleryFiles") as File[];

    if (!clubId)
      return NextResponse.json({ error: "Falta Club ID" }, { status: 400 });

    const settings = JSON.parse(settingsRaw);

    // Array de strings que representa el orden deseado.
    // Ej: ["https://supabase.../foto1.jpg", "new-file-0", "https://supabase.../foto2.jpg"]
    const galleryOrder = JSON.parse(galleryOrderRaw || "[]") as string[];

    // 1. Subir las imágenes nuevas y guardar sus URLs en un mapa
    const uploadedUrlsMap: Record<string, string> = {};

    if (imageFiles.length > 0) {
      // Procesamos las subidas en paralelo
      await Promise.all(
        imageFiles.map(async (file, index) => {
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

          // Mapeamos el índice temporal con la URL real
          // La clave será "new-file-{index}" coincidiendo con lo que manda el front
          uploadedUrlsMap[`new-file-${index}`] = data.publicUrl;
        }),
      );
    }

    // 2. Reconstruir el array final respetando el orden
    const finalGalleryUrls = galleryOrder
      .map((item) => {
        // Si el item empieza con "new-file-", es una referencia a un archivo recién subido
        if (item.startsWith("new-file-")) {
          return uploadedUrlsMap[item] || null; // Si falla algo, null (luego filtramos)
        }
        // Si no, es una URL existente
        return item;
      })
      .filter(Boolean) as string[]; // Eliminamos nulos

    // 3. Lógica de Precio (Sanitización)
    let precioFinal = settings.precio;
    if (
      precioFinal === "" ||
      precioFinal === undefined ||
      precioFinal === "0"
    ) {
      precioFinal = null;
    }

    // 4. Actualizar DB
    const { error } = await supabaseAdmin.from("quinchos").upsert(
      {
        id_club: clubId,
        activo: settings.activo,
        titulo: settings.titulo,
        descripcion: settings.descripcion,
        precio: precioFinal,
        galeria: finalGalleryUrls, // Guardamos el array ordenado
        whatsapp_numero: settings.whatsapp_numero,
        whatsapp_mensaje: settings.whatsapp_mensaje,
      },
      { onConflict: "id_club" },
    );

    if (error) throw error;

    return NextResponse.json({ success: true, galeria: finalGalleryUrls });
  } catch (error: any) {
    console.error("Error updating quincho:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
