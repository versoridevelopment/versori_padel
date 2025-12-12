// src/app/api/superadmin/clubes/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { ensureClubBaseFolders } from "@/lib/storage/clubFolders";

export const runtime = "nodejs";

/**
 * NOTA:
 * Estas rutas deben estar protegidas para que solo un SUPER_ADMIN tenga acceso.
 * Podés aplicar la lógica de auth/roles vía middleware o dentro de cada handler.
 */

/**
 * GET /api/superadmin/clubes
 * Lista TODOS los clubes (activos e inactivos).
 * Si quisieras ver solo activos, podrías agregar .eq("estado", true).
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("clubes")
      .select(
        "id_club, nombre, subdominio, logo_url, color_primario, color_secundario, imagen_hero_url, color_texto, texto_bienvenida_titulo, texto_bienvenida_subtitulo, estado, created_at"
      )
      .order("id_club", { ascending: true });

    if (error) {
      console.error("[SUPERADMIN GET /clubes] error:", error);
      return NextResponse.json(
        { error: "Error al obtener clubes" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[SUPERADMIN GET /clubes] ex:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/clubes
 * Crea un club nuevo y genera las carpetas base en el bucket.
 *
 * Body JSON:
 * {
 *   nombre: string,
 *   subdominio: string,
 *   logo_url: string,
 *   color_primario: string,
 *   color_secundario: string,
 *   imagen_hero_url: string,
 *   color_texto: string,
 *   texto_bienvenida_titulo: string,
 *   texto_bienvenida_subtitulo: string
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      nombre,
      subdominio,
      logo_url,
      color_primario,
      color_secundario,
      imagen_hero_url,
      color_texto,
      texto_bienvenida_titulo,
      texto_bienvenida_subtitulo,
    } = body;

    // Validación básica
    if (
      !nombre ||
      !subdominio ||
      !logo_url ||
      !color_primario ||
      !color_secundario ||
      !imagen_hero_url ||
      !color_texto ||
      !texto_bienvenida_titulo ||
      !texto_bienvenida_subtitulo
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    // Crear club en la base de datos
    const { data, error } = await supabaseAdmin
      .from("clubes")
      .insert([
        {
          nombre,
          subdominio,
          logo_url,
          color_primario,
          color_secundario,
          imagen_hero_url,
          color_texto,
          texto_bienvenida_titulo,
          texto_bienvenida_subtitulo,
          estado: true, // club activo al crearse
        },
      ])
      .select(
        "id_club, nombre, subdominio, logo_url, color_primario, color_secundario, imagen_hero_url, color_texto, texto_bienvenida_titulo, texto_bienvenida_subtitulo, estado, created_at"
      )
      .single();

    if (error || !data) {
      console.error("[SUPERADMIN POST /clubes] error:", error);
      return NextResponse.json(
        { error: "Error al crear el club" },
        { status: 500 }
      );
    }

    // Crear estructura base en el bucket (no hace fallar el alta si da error)
    try {
      await ensureClubBaseFolders(data.id_club);
    } catch (storageError) {
      console.error(
        "[SUPERADMIN POST /clubes] Error al crear carpetas de Storage:",
        storageError
      );
      // Podrías decidir devolver 500 si querés que sea crítico.
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[SUPERADMIN POST /clubes] ex:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
