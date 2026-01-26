import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Provider = "efectivo" | "transferencia" | "mercadopago";
type Body = {
  amount: number;
  currency?: string; // default ARS
  provider: Provider;
  status?: string; // default approved
  note?: string | null;

  // opcional si querés registrar MP manualmente
  mp_payment_id?: number | null;
  mp_status?: string | null;
  mp_status_detail?: string | null;
  raw?: any;
};

async function assertAdminOrStaff(params: { id_club: number; userId: string }) {
  const { id_club, userId } = params;

  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("id_usuario, id_club, roles!inner(nombre)")
    .eq("id_club", id_club)
    .eq("id_usuario", userId)
    .in("roles.nombre", ["admin", "staff"])
    .limit(1);

  if (error) return { ok: false as const, status: 500, error: `Error validando rol: ${error.message}` };
  if (!data || data.length === 0) return { ok: false as const, status: 403, error: "No tenés permisos admin/staff" };
  return { ok: true as const };
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const id_reserva = Number(ctx.params.id);
    if (!id_reserva || Number.isNaN(id_reserva)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;

    const amount = Number(body?.amount || 0);
    const currency = String(body?.currency || "ARS");
    const provider = String(body?.provider || "") as Provider;
    const status = String(body?.status || "approved");
    const note = (body?.note ?? null) as string | null;

    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "amount inválido" }, { status: 400 });
    if (!["ARS"].includes(currency)) return NextResponse.json({ error: "currency inválida" }, { status: 400 });
    if (!["efectivo", "transferencia", "mercadopago"].includes(provider)) {
      return NextResponse.json({ error: "provider inválido" }, { status: 400 });
    }

    // Auth
    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr) return NextResponse.json({ error: "No se pudo validar sesión" }, { status: 401 });
    const userId = authRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });

    // Leer reserva
    const { data: reserva, error: rErr } = await supabaseAdmin
      .from("reservas")
      .select("id_reserva, id_club, estado, precio_total, confirmed_at")
      .eq("id_reserva", id_reserva)
      .maybeSingle();

    if (rErr) return NextResponse.json({ error: `Error leyendo reserva: ${rErr.message}` }, { status: 500 });
    if (!reserva) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

    const id_club = Number((reserva as any).id_club);

    // Permisos
    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status });

    // Insert pago (tabla reservas_pagos)
    const payloadPago: any = {
      id_reserva,
      id_club,
      provider,
      status, // "approved" recomendado para caja/transferencia
      amount,
      currency,
      raw: body?.raw ?? (note ? { note } : null),
      last_event_at: new Date().toISOString(),
      mp_payment_id: body?.mp_payment_id ?? null,
      mp_status: body?.mp_status ?? null,
      mp_status_detail: body?.mp_status_detail ?? null,
    };

    const { data: pago, error: pErr } = await supabaseAdmin
      .from("reservas_pagos")
      .insert(payloadPago)
      .select("id_pago")
      .single();

    if (pErr) return NextResponse.json({ error: `Error insertando pago: ${pErr.message}`, detail: pErr }, { status: 500 });

    // Si pagó algo, y la reserva estaba pendiente, la dejamos confirmada (opcional)
    // (si preferís "finalizada" cuando saldo==0, eso lo hacemos después con un cálculo real)
    if ((reserva as any).estado !== "cancelada") {
      await supabaseAdmin
        .from("reservas")
        .update({
          estado: "confirmada",
          confirmed_at: (reserva as any).confirmed_at ?? new Date().toISOString(),
        })
        .eq("id_reserva", id_reserva);
    }

    return NextResponse.json({ ok: true, id_reserva, id_pago: (pago as any)?.id_pago });
  } catch (e: any) {
    console.error("[POST /api/admin/reservas/[id]/cobrar] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
