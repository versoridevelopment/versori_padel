import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { PUBLIC_MEDIA_BUCKET, clubBasePath } from "@/lib/storage/paths";

/**
 * Carpetas base del club.
 */
const CLUB_BASE_FOLDERS = [
  "branding",
  "branding/marcas", // ✅ subcarpeta requerida
  "canchas",
  "staff",
  "establecimiento",
  "gallery",
  "nosotros",
  "profesores",
  "quinchos",
];

export async function ensureClubBaseFolders(id_club: number) {
  const basePrefix = clubBasePath(id_club); // club_{id}

  for (const folder of CLUB_BASE_FOLDERS) {
    const path = `${basePrefix}/${folder}/.keep`;

    const { error } = await supabaseAdmin.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .upload(path, Buffer.from("keep"), {
        contentType: "text/plain",
        upsert: true,
      });

    if (error) {
      console.error(
        "[ensureClubBaseFolders] Error creando .keep:",
        path,
        error
      );
    }
  }
}
