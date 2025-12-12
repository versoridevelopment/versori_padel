// src/lib/storage/clubFolders.ts
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

const BUCKET_NAME = "public-media";

/**
 * Carpetas base que queremos para cada club dentro del bucket.
 *
 * Estructura final:
 *  public-media/
 *    club_{id_club}/
 *      branding/
 *      canchas/
 *      staff/
 *      establecimiento/
 *      gallery/
 */
const CLUB_BASE_FOLDERS = [
  "branding",
  "canchas",
  "staff",
  "establecimiento",
  "gallery",
];

/**
 * Crea (o asegura) las carpetas base de un club en el bucket `public-media`.
 * Técnicamente Supabase no tiene carpetas reales: se crean al subir objetos.
 * Para “materializarlas” subimos un archivo .keep de texto plano.
 */
export async function ensureClubBaseFolders(id_club: number) {
  const basePrefix = `club_${id_club}`;

  for (const folder of CLUB_BASE_FOLDERS) {
    const path = `${basePrefix}/${folder}/.keep`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, Buffer.from("keep"), {
        contentType: "text/plain",
        upsert: true, // si ya existe, no rompe
      });

    if (error) {
      console.error(
        "[ensureClubBaseFolders] Error creando carpeta virtual:",
        path,
        error
      );
      // A criterio: podrías lanzar error si querés que falle duro.
      // throw error;
    }
  }
}
