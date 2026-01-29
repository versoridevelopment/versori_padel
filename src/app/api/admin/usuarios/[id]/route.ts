import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

type RouteParams = { id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params;

    const searchParams = req.nextUrl.searchParams;
    const clubIdStr = searchParams.get("clubId");

    if (!id || !clubIdStr) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const clubId = Number(clubIdStr);

    // 1) Obtener Perfil Base
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id_usuario", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    // 2) Obtener Roles en este Club
    // Solo nos interesa saber qué roles tiene asignados en la tabla club_usuarios
    const { data: rolesData } = await supabaseAdmin
      .from("club_usuarios")
      .select(`roles ( nombre )`)
      .eq("id_usuario", id)
      .eq("id_club", clubId);

    // Mapeamos los nombres de los roles (ej: ["admin", "cajero", "cliente"])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roles =
      rolesData?.map((r: any) => r.roles?.nombre).filter(Boolean) || [];

    // 3) Obtener Historial de Reservas COMPLETO (Incluso canceladas)
    // Esto sirve para calcular las estadísticas en el frontend
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
        created_at,
        canchas (
          nombre,
          tipos_cancha (
            nombre,
            deportes ( nombre )
          )
        )
      `,
      )
      .eq("id_usuario", id)
      .eq("id_club", clubId)
      .order("fecha", { ascending: false });

    if (reservasError) {
      console.error("Error obteniendo reservas:", reservasError);
      // No bloqueamos la respuesta si fallan las reservas, devolvemos array vacío
    }

    return NextResponse.json({
      ...profile,
      roles, // El frontend recibirá ["admin", "cajero", ...] y decidirá qué botones activar
      reservas: reservas || [],
    });
  } catch (error: any) {
    console.error("Error en GET usuario:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 },
    );
  }
}
