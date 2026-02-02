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

    // 1. Perfil Base
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

    // 2. Datos del Club (Roles y NOTAS)
    // Aquí traemos el campo 'notas' que agregaste a la base de datos
    const { data: memberData } = await supabaseAdmin
      .from("club_usuarios")
      .select("notas, roles ( nombre )")
      .eq("id_usuario", id)
      .eq("id_club", clubId);

    const roles =
      memberData?.map((r: any) => r.roles?.nombre).filter(Boolean) || [];
    // Tomamos la nota del primer registro encontrado (asumiendo 1 usuario x club)
    const notasInternas = memberData?.[0]?.notas || "";

    // 3. Historial de Reservas
    const { data: reservas } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        id_reserva, fecha, inicio, fin, precio_total, estado, created_at,
        canchas ( nombre, tipos_cancha ( nombre, deportes ( nombre ) ) )
      `,
      )
      .eq("id_usuario", id)
      .eq("id_club", clubId)
      .order("fecha", { ascending: false });

    return NextResponse.json({
      ...profile,
      roles,
      reservas: reservas || [],
      notas_internas: notasInternas, // <--- Esto conecta con el frontend
    });
  } catch (error: any) {
    console.error("Error GET usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
