import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id_club = searchParams.get("id_club");

    if (!id_club)
      return NextResponse.json({ error: "Falta id_club" }, { status: 400 });

    // 1. Traemos también la columna 'cliente_manual_activo'
    const { data: reservas, error } = await supabaseAdmin
      .from("reservas")
      .select(
        "cliente_nombre, cliente_telefono, cliente_email, precio_total, created_at, fecha, cliente_manual_activo",
      )
      .eq("id_club", id_club)
      .is("id_usuario", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 2. Agrupar
    const clientesMap = new Map();

    reservas?.forEach((r) => {
      const nombre = r.cliente_nombre?.trim() || "Sin Nombre";
      const telefono = r.cliente_telefono?.trim() || "";
      const email = r.cliente_email?.trim() || "";

      // Clave única
      const key = telefono ? telefono : nombre.toLowerCase();

      if (!clientesMap.has(key)) {
        clientesMap.set(key, {
          id: key,
          nombre,
          telefono,
          email,
          total_reservas: 0,
          total_gastado: 0,
          ultima_reserva: r.fecha,
          // Tomamos el estado de la reserva más reciente (como vienen ordenadas, es la actual)
          activo: r.cliente_manual_activo !== false, // true por defecto
        });
      }

      const cliente = clientesMap.get(key);
      cliente.total_reservas += 1;
      cliente.total_gastado += Number(r.precio_total || 0);
    });

    const listaClientes = Array.from(clientesMap.values());

    return NextResponse.json({ ok: true, clientes: listaClientes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
