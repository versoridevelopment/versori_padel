// src/app/api/admin/canchas/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

/**
 * GET /api/admin/canchas?id_club=1
 * Lista TODAS las canchas del club (estado true y false)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idClubParam = searchParams.get("id_club");

    if (!idClubParam) {
      return NextResponse.json(
        { error: "id_club es requerido" },
        { status: 400 }
      );
    }

    const id_club = Number(idClubParam);
    if (Number.isNaN(id_club)) {
      return NextResponse.json(
        { error: "id_club debe ser numérico" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("v_canchas_detalle")
      .select("*")
      .eq("id_club", id_club)
      .order("id_cancha", { ascending: true });

    if (error) {
      console.error("[ADMIN GET /canchas] error:", error);
      return NextResponse.json(
        { error: "Error al obtener canchas" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[ADMIN GET /canchas] ex:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/canchas
 * Crea una cancha nueva (estado por defecto = true)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      id_club,
      id_tipo_cancha,
      nombre,
      descripcion,
      precio_hora,
      imagen_url,
      es_exterior = true,
      activa = true,
    } = body;

    if (!id_club || !id_tipo_cancha || !nombre || !precio_hora) {
      return NextResponse.json(
        {
          error:
            "id_club, id_tipo_cancha, nombre y precio_hora son obligatorios",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("canchas")
      .insert([
        {
          id_club,
          id_tipo_cancha,
          nombre,
          descripcion,
          precio_hora,
          imagen_url,
          es_exterior,
          activa,
          estado: true, // cancha vigente al crear
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[ADMIN POST /canchas] error:", error);
      return NextResponse.json(
        { error: "Error al crear la cancha" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[ADMIN POST /canchas] ex:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
