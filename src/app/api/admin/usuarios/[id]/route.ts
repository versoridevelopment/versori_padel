import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = req.nextUrl.searchParams;
    const clubId = searchParams.get("clubId");

    if (!id || !clubId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // 1. Obtener Perfil Base
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

    // 2. Obtener Roles en este Club
    // ✅ CORRECCIÓN: Quitamos "error: rolesError" porque no lo usabas
    const { data: rolesData } = await supabaseAdmin
      .from("club_usuarios")
      .select(
        `
        id_rol,
        roles ( nombre )
      `
      )
      .eq("id_usuario", id)
      .eq("id_club", clubId);

    const roles = rolesData?.map((r: any) => r.roles?.nombre) || [];

    // 3. Obtener Historial de Reservas
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

    const responseData = {
      ...profile,
      roles: roles,
      reservas: reservas || [],
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Error en GET usuario:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}