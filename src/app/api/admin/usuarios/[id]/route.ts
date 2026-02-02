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

    // 1) Obtener Perfil Base (Datos personales)
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

    // 2) Obtener Roles y Notas en este Club
    // Buscamos en club_usuarios para saber sus roles y si tiene notas internas
    const { data: memberData } = await supabaseAdmin
      .from("club_usuarios")
      .select(`notas, roles ( nombre )`)
      .eq("id_usuario", id)
      .eq("id_club", clubId);

    // Procesamos Roles: Array de strings ["admin", "cajero"]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roles =
      memberData?.map((r: any) => r.roles?.nombre).filter(Boolean) || [];

    // Procesamos Notas: Tomamos la nota de la primera entrada (si existe)
    // Ya que las notas suelen ser globales por usuario en el club
    const notasInternas = memberData?.[0]?.notas || "";

    // 3) Obtener Historial de Reservas COMPLETO
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
    }

    // 4) Respuesta Final Combinada
    return NextResponse.json({
      ...profile, // nombre, email, telefono, etc.
      roles, // ["admin", "cajero"]
      reservas: reservas || [],
      notas_internas: notasInternas, // ✅ Campo nuevo para el frontend
      // Si tienes un campo 'bloqueado' en club_usuarios, agrégalo al select del paso 2
      bloqueado: false, // Default por ahora si no está en schema
    });
  } catch (error: any) {
    console.error("Error en GET usuario:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 },
    );
  }
}
