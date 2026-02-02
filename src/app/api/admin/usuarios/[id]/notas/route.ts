import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

type RouteParams = { id: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await params; // ID del usuario
    const body = await req.json();
    const { clubId, notas } = body;

    if (!id || !clubId) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 },
      );
    }

    // Actualizamos el campo 'notas' en la tabla intermedia club_usuarios
    const { error } = await supabaseAdmin
      .from("club_usuarios")
      .update({ notas: notas })
      .eq("id_usuario", id)
      .eq("id_club", clubId);

    if (error) {
      console.error("Error al guardar notas:", error);
      return NextResponse.json(
        { error: "Error de base de datos" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Excepción en notas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
