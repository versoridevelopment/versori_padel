import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { nombre, id_club, nuevoEstado } = await req.json(); // nuevoEstado: boolean

    // Actualizamos TODAS las reservas de este nombre para que el estado sea consistente
    const { error } = await supabaseAdmin
      .from("reservas")
      .update({ cliente_manual_activo: nuevoEstado })
      .eq("id_club", id_club)
      .eq("cliente_nombre", nombre)
      .is("id_usuario", null);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
