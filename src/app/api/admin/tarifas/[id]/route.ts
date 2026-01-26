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
 * PATCH /api/admin/tarifas/:id
 * Body: campos editables (segmento, dow, hora_desde, hora_hasta, cruza_medianoche, duracion_min, precio, prioridad, activo, vigente_desde, vigente_hasta)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅ Next 15
  const parsed = parseId(idParam);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    const allowed = [
      "segmento",
      "dow",
      "hora_desde",
      "hora_hasta",
      "cruza_medianoche",
      "duracion_min",
      "precio",
      "prioridad",
      "activo",
      "vigente_desde",
      "vigente_hasta",
    ];

    const updateData: any = {};
    for (const k of allowed) {
      if (body?.[k] !== undefined) updateData[k] = body[k];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No se enviaron campos para actualizar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("canchas_tarifas_reglas")
      .update(updateData)
      .eq("id_regla", parsed.id)
      .select()
      .single();

    if (error) {
      console.error("[ADMIN PATCH /tarifas/:id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[ADMIN PATCH /tarifas/:id] ex:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tarifas/:id
 * Baja lógica: activo=false
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅ Next 15
  const parsed = parseId(idParam);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("canchas_tarifas_reglas")
      .update({ activo: false })
      .eq("id_regla", parsed.id)
      .select()
      .single();

    if (error) {
      console.error("[ADMIN DELETE /tarifas/:id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, regla: data });
  } catch (err: any) {
    console.error("[ADMIN DELETE /tarifas/:id] ex:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
