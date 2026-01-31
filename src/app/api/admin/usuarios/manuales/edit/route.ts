import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { oldNombre, id_club, newTelefono, newEmail } = await req.json();

    // Actualizamos TODAS las reservas de este "usuario manual"
    // para que la próxima vez que se agrupen, tengan los datos nuevos.
    const { error } = await supabaseAdmin
      .from("reservas")
      .update({
        cliente_telefono: newTelefono,
        cliente_email: newEmail,
      })
      .eq("id_club", id_club)
      .eq("cliente_nombre", oldNombre)
      .is("id_usuario", null);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
