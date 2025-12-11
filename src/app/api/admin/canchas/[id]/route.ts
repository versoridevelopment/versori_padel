// src/app/api/admin/canchas/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

function parseId(params: { id?: string }) {
  const idParam = params.id;
  if (!idParam) return { error: "id es requerido" };

  const id = Number(idParam);
  if (Number.isNaN(id)) return { error: "id debe ser numérico" };

  return { id };
}

/**
 * GET /api/admin/canchas/:id
 * Devuelve una cancha (sea estado true o false)
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id, error: parseError } = parseId(params);
  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("v_canchas_detalle")
      .select("*")
      .eq("id_cancha", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Cancha no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[ADMIN GET /canchas/:id] ex:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/canchas/:id
 * Actualiza campos y permite reactivar/desactivar (estado true/false)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id, error: parseError } = parseId(params);
  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    const body = await req.json();

    const allowed = [
      "nombre",
      "descripcion",
      "precio_hora",
      "imagen_url",
      "es_exterior",
      "activa",
      "id_tipo_cancha",
      "estado", // el admin puede poner estado=true (reactivar) o estado=false (desactivar)
    ];

    const updateData: any = {};

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No se enviaron campos para actualizar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("canchas")
      .update(updateData)
      .eq("id_cancha", id)
      .select()
      .single();

    if (error) {
      console.error("[ADMIN PATCH /canchas/:id] error:", error);
      return NextResponse.json(
        { error: "Error al actualizar la cancha" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[ADMIN PATCH /canchas/:id] ex:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/canchas/:id
 * BAJA LÓGICA → estado = false
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id, error: parseError } = parseId(params);
  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("canchas")
      .update({ estado: false }) // baja lógica
      .eq("id_cancha", id);

    if (error) {
      console.error("[ADMIN DELETE /canchas/:id] error:", error);
      return NextResponse.json(
        { error: "Error al desactivar la cancha (estado = 0)" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Cancha desactivada (estado = 0)" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[ADMIN DELETE /canchas/:id] ex:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
