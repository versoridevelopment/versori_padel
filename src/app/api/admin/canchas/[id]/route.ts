// src/app/api/admin/canchas/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import {
  uploadCanchaImage,
  extractPathFromPublicUrl,
} from "@/lib/storage/uploadCanchaImage";

export const runtime = "nodejs";

type RouteParams = { id: string };

function parseId(idParam?: string) {
  if (!idParam) return { error: "id es requerido" };

  const id = Number(idParam);
  if (Number.isNaN(id)) return { error: "id debe ser numérico" };

  return { id };
}

/**
 * GET /api/admin/canchas/:id
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅ Next 15: params es Promise
  const { id, error: parseError } = parseId(idParam);

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
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/canchas/:id
 * - JSON o multipart/form-data
 * - Si viene file "imagen": sube a club_{id_club}/canchas/..., actualiza imagen_url y borra anterior (best-effort)
 * - Soporta id_tarifario:
 *    - null / "" => usar default del tipo de cancha (club_tarifarios_default)
 *    - number    => override por cancha
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅
  const { id, error: parseError } = parseId(idParam);

  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const updateData: any = {};

    let oldImagePath: string | null = null;
    let idClubForSafety: number | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();

      const nombre = form.get("nombre");
      const descripcion = form.get("descripcion");
      const precio_hora = form.get("precio_hora");
      const es_exterior = form.get("es_exterior");
      const activa = form.get("activa");
      const id_tipo_cancha = form.get("id_tipo_cancha");
      const estado = form.get("estado");

      // NUEVO: id_tarifario (puede venir vacío para dejar NULL)
      const id_tarifario = form.get("id_tarifario");

      if (nombre !== null) updateData.nombre = String(nombre);
      if (descripcion !== null) updateData.descripcion = String(descripcion);
      if (precio_hora !== null) updateData.precio_hora = Number(precio_hora);
      if (es_exterior !== null)
        updateData.es_exterior = String(es_exterior) === "true";
      if (activa !== null) updateData.activa = String(activa) === "true";
      if (id_tipo_cancha !== null)
        updateData.id_tipo_cancha = Number(id_tipo_cancha);
      if (estado !== null) updateData.estado = String(estado) === "true";

      // Manejo robusto de id_tarifario:
      // - "" => null (usar default)
      // - "123" => 123
      if (id_tarifario !== null) {
        const v = String(id_tarifario).trim();
        updateData.id_tarifario = v === "" ? null : Number(v);
      }

      const file = form.get("imagen");
      if (file && file instanceof File && file.size > 0) {
        // 1) Traer id_club + imagen_url actual
        const { data: canchaActual, error: canchaActualError } =
          await supabaseAdmin
            .from("canchas")
            .select("id_club, imagen_url")
            .eq("id_cancha", id)
            .single();

        if (canchaActualError || !canchaActual) {
          return NextResponse.json(
            {
              error:
                "No se pudo obtener la cancha actual para reemplazar imagen",
            },
            { status: 400 }
          );
        }

        const id_club_db = canchaActual.id_club as number;
        idClubForSafety = id_club_db;

        const oldUrl = (canchaActual.imagen_url as string | null) ?? null;
        oldImagePath = oldUrl
          ? extractPathFromPublicUrl(oldUrl, "public-media")
          : null;

        // 2) Subir nueva imagen
        const uploaded = await uploadCanchaImage({ id_club: id_club_db, file });
        updateData.imagen_url = uploaded.publicUrl;
      } else {
        // opcional: permitir setear imagen_url manual
        const imagen_url = form.get("imagen_url");
        if (imagen_url !== null) updateData.imagen_url = String(imagen_url);
      }
    } else {
      // JSON
      const body = await req.json();
      const allowed = [
        "nombre",
        "descripcion",
        "precio_hora",
        "imagen_url",
        "es_exterior",
        "activa",
        "id_tipo_cancha",
        "estado",
        "id_tarifario",
      ];

      for (const key of allowed) {
        if (body[key] !== undefined) updateData[key] = body[key];
      }

      // Normalización: si mandan "" en JSON, lo pasamos a null
      if (updateData.id_tarifario === "") updateData.id_tarifario = null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No se enviaron campos para actualizar" },
        { status: 400 }
      );
    }

    // Validación leve: si viene id_tarifario number, que sea numérico
    if (
      updateData.id_tarifario !== undefined &&
      updateData.id_tarifario !== null &&
      Number.isNaN(Number(updateData.id_tarifario))
    ) {
      return NextResponse.json(
        { error: "id_tarifario debe ser numérico o null" },
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

    // 3) Borrar imagen anterior (best-effort)
    if (oldImagePath && typeof oldImagePath === "string") {
      const expectedPrefix =
        idClubForSafety !== null ? `club_${idClubForSafety}/canchas/` : "club_";

      const okToDelete =
        idClubForSafety !== null
          ? oldImagePath.startsWith(expectedPrefix)
          : oldImagePath.includes("/canchas/") && oldImagePath.startsWith("club_");

      if (okToDelete) {
        const { error: removeError } = await supabaseAdmin.storage
          .from("public-media")
          .remove([oldImagePath]);

        if (removeError) {
          console.warn(
            "[ADMIN PATCH /canchas/:id] remove old image error:",
            removeError
          );
        }
      } else {
        console.warn(
          "[ADMIN PATCH /canchas/:id] skip remove (path fuera de club/canchas):",
          oldImagePath
        );
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[ADMIN PATCH /canchas/:id] ex:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/canchas/:id (baja lógica)
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id: idParam } = await params; // ✅
  const { id, error: parseError } = parseId(idParam);

  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("canchas")
      .update({ estado: false })
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
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
