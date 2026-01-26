import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

type Estado = "pendiente_pago" | "confirmada" | "expirada" | "rechazada";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const id_reserva = Number(id);

    if (!id_reserva || Number.isNaN(id_reserva)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    // Traemos todo lo necesario para el comprobante
    const { data, error } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        id_reserva,
        id_club,
        id_cancha,
        id_usuario,
        fecha,
        inicio,
        fin,
        fin_dia_offset,
        estado,
        precio_total,
        anticipo_porcentaje,
        monto_anticipo,
        segmento,
        id_tarifario,
        id_regla,
        expires_at,
        created_at,
        confirmed_at,
        cliente_nombre,
        cliente_telefono,
        cliente_email,
        notas,
        tipo_turno,
        clubes:clubes (
          id_club,
          nombre,
          subdominio
        ),
        canchas:canchas (
          id_cancha,
          nombre
        ),
        reservas_pagos (
          id_pago,
          status,
          mp_status,
          mp_status_detail,
          mp_payment_id,
          amount,
          currency,
          created_at
        )
      `
      )
      .eq("id_reserva", id_reserva)
      .order("created_at", { referencedTable: "reservas_pagos", ascending: false })
      .limit(1, { referencedTable: "reservas_pagos" })
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    const now = new Date();

    // Si está pendiente y ya expiró, reportar como expirada al frontend
    let estado: Estado = data.estado as Estado;

    if (estado === "pendiente_pago" && data.expires_at) {
      const exp = new Date(data.expires_at);
      if (!Number.isFinite(exp.getTime()) || exp <= now) {
        estado = "expirada";
      }
    }

    // Si el último pago real fue rejected/cancelled, reportar rechazada
    const ultimoPago = (data as any).reservas_pagos?.[0];
    if (ultimoPago && ["rejected", "cancelled"].includes(String(ultimoPago.mp_status))) {
      estado = "rechazada";
    }

    // Respuesta “comprobante-friendly”
    return NextResponse.json({
      id_reserva: data.id_reserva,
      estado,
      expires_at: data.expires_at,
      confirmed_at: data.confirmed_at,

      // Comprobante
      id_club: data.id_club,
      id_cancha: data.id_cancha,
      fecha: data.fecha,
      inicio: data.inicio,
      fin: data.fin,
      fin_dia_offset: data.fin_dia_offset,

      precio_total: data.precio_total,
      anticipo_porcentaje: data.anticipo_porcentaje,
      monto_anticipo: data.monto_anticipo,

      cliente_nombre: data.cliente_nombre,
      cliente_telefono: data.cliente_telefono,
      cliente_email: data.cliente_email,

      club_nombre: (data as any).clubes?.nombre ?? null,
      club_subdominio: (data as any).clubes?.subdominio ?? null,
      cancha_nombre: (data as any).canchas?.nombre ?? null,

      ultimo_pago: ultimoPago
        ? {
            id_pago: ultimoPago.id_pago,
            status: ultimoPago.status,
            mp_status: ultimoPago.mp_status,
            mp_status_detail: ultimoPago.mp_status_detail,
            mp_payment_id: ultimoPago.mp_payment_id,
            amount: ultimoPago.amount,
            currency: ultimoPago.currency,
            created_at: ultimoPago.created_at,
          }
        : null,
    });
  } catch (e: any) {
    console.error("[GET /api/reservas/:id] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
