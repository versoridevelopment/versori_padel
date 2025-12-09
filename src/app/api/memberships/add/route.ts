import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { clubId, userId } = await req.json();

    if (!clubId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing clubId or userId" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // solo en servidor
    );

    // Inserta o ignora si ya existía la membresía
    const { error: insertError } = await supabase
      .from("club_usuarios")
      .upsert(
        {
          id_usuario: userId,
          id_club: clubId,
          id_rol: 3, // cliente (asegurate que sea el ID correcto)
        },
        {
          onConflict: "id_usuario,id_club,id_rol",
          ignoreDuplicates: true,
        }
      );

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Server error", detail: String(e) },
      { status: 500 }
    );
  }
}
