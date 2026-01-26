import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

type RouteParams = { id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params; // ✅ Next 15: params es Promise

    const searchParams = req.nextUrl.searchParams;
    const clubIdStr = searchParams.get("clubId");

    if (!id || !clubIdStr) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const clubId = Number(clubIdStr);
    if (Number.isNaN(clubId)) {
      return NextResponse.json(
        { error: "clubId debe ser numérico" },
        { status: 400 }
      );
    }

    // 1) Obtener Perfil Base
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id_usuario", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // 2) Obtener Roles en este Club
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from("club_usuarios")
      .select(
        `
        id_rol,
        roles ( nombre )
      `
      )
      .eq("id_usuario", id)
      .eq("id_club", clubId);

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    const roles = rolesData?.map((r: any) => r.roles?.nombre).filter(Boolean) || [];

    // 3) Obtener Historial de Reservas
    const { data: reservas, error: reservasError } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        id_reserva,
        fecha,
        inicio,
        fin,
        precio_total,
        estado,
        canchas (
          nombre,
          tipos_cancha (
            nombre,
            deportes ( nombre )
          )
        )
      `
      )
      .eq("id_usuario", id)
      .eq("id_club", clubId)
      .order("fecha", { ascending: false });

    if (reservasError) {
      console.error("Error fetching reservas:", reservasError);
    }

    return NextResponse.json({
      ...profile,
      roles,
      reservas: reservas || [],
    });
  } catch (error: any) {
    console.error("Error en GET usuario:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}
