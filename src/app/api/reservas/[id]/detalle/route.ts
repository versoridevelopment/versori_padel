import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSubdomainFromHost } from "@/lib/ObetenerClubUtils/tenantUtils";
import { getClubBySubdomain } from "@/lib/ObetenerClubUtils/getClubBySubdomain";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const id_reserva = Number(id);
    if (!id_reserva || Number.isNaN(id_reserva)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    // ✅ sesión obligatoria (es “Mis reservas”)
    const supabase = await getSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // ✅ club por subdominio (para evitar que veas reservas de otro club)
    const url = new URL(req.url);
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
    const sub = getSubdomainFromHost(host);
    if (!sub) return NextResponse.json({ error: "Club inválido (sin subdominio)" }, { status: 400 });

    const club = await getClubBySubdomain(sub);
    const id_club = Number((club as any)?.id_club || (club as any)?.idClub || 0);
    if (!id_club) return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });

    // ✅ Traer reserva + pagos
    const { data: r, error } = await supabaseAdmin
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
        confirmed_at,
        created_at,
        cliente_nombre,
        cliente_telefono,
        cliente_email,
        clubes:clubes ( nombre, subdominio ),
        canchas:canchas ( nombre ),
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
      .eq("id_club", id_club)
      .eq("id_usuario", userId)
      .order("created_at", { referencedTable: "reservas_pagos", ascending: false })
      .limit(1, { referencedTable: "reservas_pagos" })
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!r) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

    const ultimo_pago = (r as any).reservas_pagos?.[0] ?? null;

    // ✅ Fallback cliente desde profiles
    let cliente_nombre: string | null = r.cliente_nombre ?? null;
    let cliente_telefono: string | null = r.cliente_telefono ?? null;
    let cliente_email: string | null = r.cliente_email ?? null;

    if (r.id_usuario && (!cliente_nombre || !cliente_telefono || !cliente_email)) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("nombre, apellido, telefono, email")
        .eq("id_usuario", r.id_usuario)
        .maybeSingle();

      if (prof) {
        const full = [prof.nombre, prof.apellido].filter(Boolean).join(" ").trim();
        if (!cliente_nombre && full) cliente_nombre = full;
        if (!cliente_telefono && prof.telefono) cliente_telefono = prof.telefono;
        if (!cliente_email && prof.email) cliente_email = prof.email;
      }
    }

    return NextResponse.json({
      id_reserva: r.id_reserva,
      estado: r.estado,
      confirmed_at: r.confirmed_at,
      created_at: r.created_at,

      fecha: r.fecha,
      inicio: r.inicio,
      fin: r.fin,
      fin_dia_offset: r.fin_dia_offset,

      precio_total: r.precio_total,
      anticipo_porcentaje: r.anticipo_porcentaje,
      monto_anticipo: r.monto_anticipo,

      club_nombre: (r as any).clubes?.nombre ?? null,
      club_subdominio: (r as any).clubes?.subdominio ?? null,
      cancha_nombre: (r as any).canchas?.nombre ?? null,

      cliente_nombre,
      cliente_telefono,
      cliente_email,

      ultimo_pago: ultimo_pago
        ? {
            id_pago: ultimo_pago.id_pago,
            status: ultimo_pago.status,
            mp_status: ultimo_pago.mp_status,
            mp_status_detail: ultimo_pago.mp_status_detail,
            mp_payment_id: ultimo_pago.mp_payment_id,
            amount: ultimo_pago.amount,
            currency: ultimo_pago.currency,
            created_at: ultimo_pago.created_at,
          }
        : null,
    });
  } catch (e: any) {
    console.error("[GET /api/reservas/:id/detalle] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
