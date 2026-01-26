// src/app/api/superadmin/clubes/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

type RouteParams = { id: string };

function parseId(idParam?: string) {
  if (!idParam) return { error: "id es requerido" as const };

  const id = Number(idParam);
  if (Number.isNaN(id)) return { error: "id debe ser numérico" as const };

  return { id };
}

/**
 * GET /api/superadmin/clubes/:id
 * Obtiene un club por id_club (activo o inactivo).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅ Next 15
  const { id, error: parseError } = parseId(idParam);

  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("clubes")
      .select(
        "id_club, nombre, subdominio, logo_url, color_primario, color_secundario, imagen_hero_url, color_texto, texto_bienvenida_titulo, texto_bienvenida_subtitulo, estado, created_at"
      )
      .eq("id_club", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[SUPERADMIN GET /clubes/:id] ex:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/superadmin/clubes/:id
 * Actualiza campos del club (incluido estado para activar/desactivar).
 *
 * Body JSON: cualquiera de los campos permitidos.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅ Next 15
  const { id, error: parseError } = parseId(idParam);

  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    const body = await req.json();

    const allowedFields = [
      "nombre",
      "subdominio",
      "logo_url",
      "color_primario",
      "color_secundario",
      "imagen_hero_url",
      "color_texto",
      "texto_bienvenida_titulo",
      "texto_bienvenida_subtitulo",
      "estado",
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No se enviaron campos para actualizar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("clubes")
      .update(updateData)
      .eq("id_club", id)
      .select(
        "id_club, nombre, subdominio, logo_url, color_primario, color_secundario, imagen_hero_url, color_texto, texto_bienvenida_titulo, texto_bienvenida_subtitulo, estado, created_at"
      )
      .single();

    if (error || !data) {
      console.error("[SUPERADMIN PATCH /clubes/:id] error:", error);
      return NextResponse.json(
        { error: "Error al actualizar el club" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[SUPERADMIN PATCH /clubes/:id] ex:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superadmin/clubes/:id
 * BAJA LÓGICA → estado = false (no se borra el registro).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅ Next 15
  const { id, error: parseError } = parseId(idParam);

  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("clubes")
      .update({ estado: false })
      .eq("id_club", id);

    if (error) {
      console.error("[SUPERADMIN DELETE /clubes/:id] error:", error);
      return NextResponse.json(
        { error: "Error al desactivar el club (estado = 0)" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Club desactivado (estado = 0)" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[SUPERADMIN DELETE /clubes/:id] ex:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
