import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const clubId = searchParams.get("clubId");

    if (!clubId) {
      return NextResponse.json({ error: "Falta clubId" }, { status: 400 });
    }

    const now = new Date();
    // Calcular inicio de semana (Lunes) y inicio de mes
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1))
      .toISOString()
      .split("T")[0];
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split("T")[0];

    // 1. Reservas de la Semana (Confirmadas o Pendientes)
    const { count: reservasSemana, error: errReservas } = await supabaseAdmin
      .from("reservas")
      .select("*", { count: "exact", head: true })
      .eq("id_club", clubId)
      .gte("fecha", startOfWeek)
      .neq("estado", "cancelada"); // Excluir canceladas

    // 2. Total de Clientes (Usuarios únicos en club_usuarios)
    const { count: clientesTotal, error: errClientes } = await supabaseAdmin
      .from("club_usuarios")
      .select("*", { count: "exact", head: true })
      .eq("id_club", clubId)
      .neq("id_rol", 1); // Asumiendo que rol 1 es admin/sistema, queremos clientes

    // 3. Ingresos del Mes (Suma de precio_total de reservas confirmadas)
    // Nota: Para mayor precisión financiera deberías sumar la tabla 'reservas_pagos',
    // pero para un dashboard rápido usamos el total de la reserva confirmada.
    const { data: reservasMes, error: errIngresos } = await supabaseAdmin
      .from("reservas")
      .select("precio_total")
      .eq("id_club", clubId)
      .eq("estado", "confirmada")
      .gte("fecha", startOfMonth);

    const ingresosMes =
      reservasMes?.reduce((acc, curr) => acc + Number(curr.precio_total), 0) ||
      0;

    // 4. Cancha más popular
    // Supabase no tiene "GROUP BY" nativo fácil en el cliente JS estándar para esto sin RPC,
    // así que traemos las reservas de la semana y contamos en JS (si son muchas, mejor usar una RPC function en SQL).
    const { data: popularData } = await supabaseAdmin
      .from("reservas")
      .select("id_cancha, canchas(nombre)")
      .eq("id_club", clubId)
      .gte("fecha", startOfMonth); // Popular del mes

    // Lógica para encontrar la top
    const conteoCanchas: Record<string, number> = {};
    let canchaTop = "N/A";
    let maxCount = 0;

    popularData?.forEach((res: any) => {
      const nombre = res.canchas?.nombre || "Cancha";
      conteoCanchas[nombre] = (conteoCanchas[nombre] || 0) + 1;
      if (conteoCanchas[nombre] > maxCount) {
        maxCount = conteoCanchas[nombre];
        canchaTop = nombre;
      }
    });

    if (errReservas || errClientes || errIngresos) {
      throw new Error("Error consultando base de datos");
    }

    return NextResponse.json({
      reservasSemana: reservasSemana || 0,
      clientesTotal: clientesTotal || 0,
      ingresosMes: ingresosMes,
      canchaTop: canchaTop,
    });
  } catch (error: any) {
    console.error("Error Dashboard API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
