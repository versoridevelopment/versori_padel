import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

type RouteParams = { id: string };

function parseId(idParam?: string) {
  if (!idParam) return { error: "id es requerido" };

  const id = Number(idParam);
  if (Number.isNaN(id)) return { error: "id debe ser numérico" };

  return { id };
}

/**
 * GET /api/admin/tarifarios/:id
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
      .from("canchas_tarifarios")
      .select("id_tarifario,id_club,nombre,descripcion,activo,created_at")
      .eq("id_tarifario", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Tarifario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[ADMIN GET /tarifarios/:id] ex:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/tarifarios/:id
 * Body JSON: { nombre?, descripcion?, activo? }
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
    const body = await req.json().catch(() => null);
    const updateData: any = {};

    if (body?.nombre !== undefined) updateData.nombre = String(body.nombre).trim();
    if (body?.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body?.activo !== undefined) updateData.activo = Boolean(body.activo);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No se enviaron campos para actualizar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("canchas_tarifarios")
      .update(updateData)
      .eq("id_tarifario", id)
      .select("id_tarifario,id_club,nombre,descripcion,activo,created_at")
      .single();

    if (error) {
      console.error("[ADMIN PATCH /tarifarios/:id] error:", error);
      return NextResponse.json(
        { error: "Error al actualizar tarifario" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[ADMIN PATCH /tarifarios/:id] ex:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/tarifarios/:id
 * Baja lógica: activo=false
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
      .from("canchas_tarifarios")
      .update({ activo: false })
      .eq("id_tarifario", id);

    if (error) {
      console.error("[ADMIN DELETE /tarifarios/:id] error:", error);
      return NextResponse.json(
        { error: "Error al desactivar tarifario" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Tarifario desactivado" }, { status: 200 });
  } catch (err) {
    console.error("[ADMIN DELETE /tarifarios/:id] ex:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
