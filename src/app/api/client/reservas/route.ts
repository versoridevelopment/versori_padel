import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // 1. Validar Sesión
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Traer Reservas con datos de la Cancha
    const { data: reservas, error } = await supabase
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
        canchas ( nombre, es_exterior, id_tipo_cancha )
      `,
      )
      .eq("id_usuario", user.id) // 🔒 CLAVE: Solo mis reservas
      .order("fecha", { ascending: false }) // Más recientes primero
      .order("inicio", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reservas });
  } catch (error: any) {
    console.error("Error mis-reservas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
