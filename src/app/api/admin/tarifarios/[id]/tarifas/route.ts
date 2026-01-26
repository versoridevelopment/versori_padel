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
 * GET /api/admin/tarifarios/:id/tarifas
 * Lista reglas de un tarifario específico
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅ Next 15
  const parsed = parseId(idParam);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    // (opcional) validar que existe
    const { data: tarifario, error: tErr } = await supabaseAdmin
      .from("canchas_tarifarios")
      .select("id_tarifario")
      .eq("id_tarifario", parsed.id)
      .maybeSingle();

    if (tErr) {
      console.error("[ADMIN GET /tarifarios/:id/tarifas] tarifario error:", tErr);
      return NextResponse.json(
        { error: "Error al validar tarifario" },
        { status: 500 }
      );
    }
    if (!tarifario) {
      return NextResponse.json(
        { error: "Tarifario no encontrado" },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("canchas_tarifas_reglas")
      .select("*")
      .eq("id_tarifario", parsed.id)
      .order("segmento", { ascending: true })
      .order("prioridad", { ascending: false })
      .order("dow", { ascending: true })
      .order("hora_desde", { ascending: true })
      .order("duracion_min", { ascending: true });

    if (error) {
      console.error("[ADMIN GET /tarifarios/:id/tarifas] error:", error);
      return NextResponse.json(
        { error: "Error al obtener tarifas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id_tarifario: parsed.id, reglas: data ?? [] });
  } catch (err: any) {
    console.error("[ADMIN GET /tarifarios/:id/tarifas] ex:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tarifarios/:id/tarifas
 * Crea una regla dentro de ese tarifario
 */
export async function POST(
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

    const payload = {
      id_tarifario: parsed.id,
      segmento: body?.segmento ?? "publico",
      dow: body?.dow ?? null,
      hora_desde: body?.hora_desde,
      hora_hasta: body?.hora_hasta,
      cruza_medianoche: body?.cruza_medianoche ?? false,
      duracion_min: body?.duracion_min,
      precio: body?.precio,
      prioridad: body?.prioridad ?? 0,
      activo: body?.activo ?? true,
      vigente_desde: body?.vigente_desde ?? new Date().toISOString().slice(0, 10),
      vigente_hasta: body?.vigente_hasta ?? null,
    };

    if (
      !payload.hora_desde ||
      !payload.hora_hasta ||
      !payload.duracion_min ||
      payload.precio == null
    ) {
      return NextResponse.json(
        { error: "hora_desde, hora_hasta, duracion_min y precio son obligatorios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("canchas_tarifas_reglas")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[ADMIN POST /tarifarios/:id/tarifas] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("[ADMIN POST /tarifarios/:id/tarifas] ex:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
