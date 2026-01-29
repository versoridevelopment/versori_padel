import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COOKIE_NAME = "reserva_draft_v1";
const HOLD_MINUTES_DEFAULT = 10;

// IDs reales
const PRIV_ROLE_IDS = new Set<number>([
  /* admin */ 1,
  /* staff */ 2,
  /* profe */ 4,
]);

type DraftSnapshot = {
  id_club: number;
  id_cancha: number;
  user_id: string | null;
  segmento: "publico" | "profe";
  fecha: string; // YYYY-MM-DD (fecha del INICIO)
  inicio: string; // HH:MM
  fin: string; // HH:MM (puede ser del día siguiente)
  duracion_min: number;
  id_tarifario: number;
  id_regla: number;
  precio_total: number;
  created_at: string;
};

function base64Decode<T = any>(s: string): T | null {
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function readDraftFromCookie(req: Request): DraftSnapshot | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(COOKIE_NAME + "="));
  if (!match) return null;
  const val = match.slice((COOKIE_NAME + "=").length);
  return base64Decode<DraftSnapshot>(val);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function toMin(hhmm: string) {
  const [hStr, mStr] = (hhmm || "").slice(0, 5).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

async function getRoleInfoInClub(
  id_club: number,
  id_usuario: string
): Promise<{
  id_rol: number | null;
  privilegiado: boolean;
  roles: number[];
}> {
  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("id_rol")
    .eq("id_club", id_club)
    .eq("id_usuario", id_usuario);

  if (error) throw new Error(error.message);

  const roles = (data || [])
    .map((r: any) => Number(r?.id_rol))
    .filter((n: number) => Number.isFinite(n));

  if (roles.length === 0) return { id_rol: null, privilegiado: false, roles: [] };

  const priv = roles.find((r) => PRIV_ROLE_IDS.has(r)) ?? null;
  if (priv != null) return { id_rol: priv, privilegiado: true, roles };

  return { id_rol: roles[0] ?? null, privilegiado: false, roles };
}

type CheckoutFlow = "zero" | "mp";

export async function POST(req: Request) {
  try {
    const draft = readDraftFromCookie(req);
    if (!draft) {
      return NextResponse.json({ error: "No hay draft de reserva" }, { status: 400 });
    }

    // 1) OBLIGAR LOGIN
    const supabase = await getSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr) {
      return NextResponse.json({ error: "No se pudo validar la sesión" }, { status: 401 });
    }

    const userId = userRes?.user?.id ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: "Tenés que iniciar sesión para confirmar la reserva" },
        { status: 401 }
      );
    }

    // 2) fin_dia_offset (si fin <= inicio, cruza medianoche)
    const iniMin = toMin(draft.inicio);
    const finMin = toMin(draft.fin);

    if (!Number.isFinite(iniMin) || !Number.isFinite(finMin)) {
      return NextResponse.json({ error: "Horario inválido en draft" }, { status: 400 });
    }

    const fin_dia_offset: 0 | 1 = finMin <= iniMin ? 1 : 0;

    // 3) Recalcular precio server-side
    const calcRes = await fetch(new URL("/api/reservas/calcular-precio", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        id_club: draft.id_club,
        id_cancha: draft.id_cancha,
        fecha: draft.fecha,
        inicio: draft.inicio,
        fin: draft.fin,
      }),
      cache: "no-store",
    });

    const calcJson = await calcRes.json().catch(() => null);

    if (!calcRes.ok) {
      return NextResponse.json(
        { error: calcJson?.error || "No se pudo recalcular el precio", detail: calcJson },
        { status: calcRes.status }
      );
    }

    const precio_total = Number(calcJson?.precio_total || 0);
    if (!Number.isFinite(precio_total) || precio_total <= 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }

    // 4) Leer club con ambos anticipos
    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, anticipo_porcentaje, anticipo_porcentaje_privilegiados")
      .eq("id_club", draft.id_club)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json({ error: `Error leyendo club: ${cErr.message}` }, { status: 500 });
    }
    if (!club) {
      return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });
    }

    // 4.1) Decidir anticipo según rol (multi-fila)
    const roleInfo = await getRoleInfoInClub(draft.id_club, userId);

    const pctRaw = roleInfo.privilegiado
      ? (club.anticipo_porcentaje_privilegiados ?? club.anticipo_porcentaje ?? 50)
      : (club.anticipo_porcentaje ?? 50);

    const pct = Math.min(100, Math.max(0, Number(pctRaw)));
    const monto_anticipo = round2(precio_total * (pct / 100));

    const commonMeta = {
      precio_total,
      anticipo_porcentaje: pct,
      monto_anticipo,
      fin_dia_offset,
      id_rol: roleInfo.id_rol,
      roles_en_club: roleInfo.roles,
      privilegiado: roleInfo.privilegiado,
      segmento: (calcJson?.segmento ?? draft.segmento ?? null) as any,
    };

    // ==========================================================
    // ✅ CASO A: anticipo 0 => confirmar SIN Mercado Pago
    // ==========================================================
    if (monto_anticipo <= 0) {
      // Idempotencia: si ya existe confirmada para este user/slot, reutilizar
      const { data: already, error: aErr } = await supabaseAdmin
        .from("reservas")
        .select("id_reserva, confirmed_at")
        .eq("id_club", draft.id_club)
        .eq("id_cancha", draft.id_cancha)
        .eq("id_usuario", userId)
        .eq("fecha", draft.fecha)
        .eq("inicio", draft.inicio)
        .eq("fin", draft.fin)
        .eq("fin_dia_offset", fin_dia_offset)
        .eq("estado", "confirmada")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (aErr) {
        return NextResponse.json(
          { error: `Error buscando confirmada: ${aErr.message}` },
          { status: 500 }
        );
      }

      if (already?.id_reserva) {
        const id_reserva = Number(already.id_reserva);
        const redirect_url = `/pago/resultado?status=success&id_reserva=${id_reserva}`;

        return NextResponse.json({
          ok: true,
          flow: "zero" as CheckoutFlow,
          payment_required: false,
          redirect_url,

          id_reserva,
          id_pago: null,
          expires_at: null,

          checkout_url: redirect_url, // compat
          reused_reserva: true,
          reused_pago: false,
          no_anticipo: true,

          ...commonMeta,
          monto_anticipo: 0,
        });
      }

      // Confirmar por RPC (sin borrar holds; tu RPC debe manejar correctamente el caso)
      const { data: created2, error: rpc2Err } = await supabaseAdmin.rpc(
        "reservas_create_confirmed_zero",
        {
          p_id_club: draft.id_club,
          p_id_cancha: draft.id_cancha,
          p_id_usuario: userId,
          p_fecha: draft.fecha,
          p_inicio: draft.inicio,
          p_fin: draft.fin,
          p_fin_dia_offset: fin_dia_offset,
          p_precio_total: precio_total,
          p_anticipo_porcentaje: pct,
          p_monto_anticipo: 0,
          p_segmento: (calcJson?.segmento ?? draft.segmento ?? null) as any,
          p_id_tarifario: Number(calcJson?.id_tarifario ?? draft.id_tarifario ?? null),
          p_id_regla: Number(calcJson?.id_regla ?? draft.id_regla ?? null),
        }
      );

      if (rpc2Err) {
        // 23P01 = exclusion_violation, P0001 = raise exception
        if (rpc2Err.code === "23P01" || rpc2Err.code === "P0001") {
          return NextResponse.json({ error: "Ese horario ya no está disponible" }, { status: 409 });
        }
        return NextResponse.json(
          {
            error: "Error confirmando reserva sin seña",
            detail: { code: rpc2Err.code, message: rpc2Err.message },
          },
          { status: 500 }
        );
      }

      const row2 = Array.isArray(created2) ? created2[0] : created2;
      const id_reserva2 = Number(row2?.id_reserva);
      if (!id_reserva2) {
        return NextResponse.json({ error: "Respuesta inválida confirmando reserva" }, { status: 500 });
      }

      // (Opcional recomendado) registrar pago 0 aprobado (auditoría)
      await supabaseAdmin.from("reservas_pagos").insert({
        id_reserva: id_reserva2,
        id_club: draft.id_club,
        provider: "no_anticipo",
        status: "approved",
        amount: 0,
        currency: "ARS",
        external_reference: String(id_reserva2),
        last_event_at: new Date().toISOString(),
      });

      const redirect_url = `/pago/resultado?status=success&id_reserva=${id_reserva2}`;

      return NextResponse.json({
        ok: true,
        flow: "zero" as CheckoutFlow,
        payment_required: false,
        redirect_url,

        id_reserva: id_reserva2,
        id_pago: null,
        expires_at: null,

        checkout_url: redirect_url, // compat
        reused_reserva: false,
        reused_pago: false,
        no_anticipo: true,

        ...commonMeta,
        monto_anticipo: 0,
      });
    }

    // ==========================================================
    // ✅ CASO B: anticipo > 0 => flujo Mercado Pago (tu lógica original)
    // ==========================================================
    const nowIso = new Date().toISOString();

    // 5) Reutilizar RESERVA pendiente vigente del mismo usuario/slot (si volvió atrás desde MP)
    const { data: existingReserva, error: exRErr } = await supabaseAdmin
      .from("reservas")
      .select("id_reserva, expires_at")
      .eq("id_club", draft.id_club)
      .eq("id_cancha", draft.id_cancha)
      .eq("id_usuario", userId)
      .eq("fecha", draft.fecha)
      .eq("inicio", draft.inicio)
      .eq("fin", draft.fin)
      .eq("fin_dia_offset", fin_dia_offset)
      .eq("estado", "pendiente_pago")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exRErr) {
      return NextResponse.json(
        { error: `Error buscando reserva existente: ${exRErr.message}` },
        { status: 500 }
      );
    }

    if (existingReserva?.id_reserva) {
      const id_reserva = Number(existingReserva.id_reserva);
      const expires_at = String(existingReserva.expires_at);

      // 5.1) Reutilizar pago activo (created/pending)
      const { data: existingPago, error: exPErr } = await supabaseAdmin
        .from("reservas_pagos")
        .select("id_pago,status")
        .eq("id_reserva", id_reserva)
        .in("status", ["created", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (exPErr) {
        return NextResponse.json(
          { error: `Error verificando pagos existentes: ${exPErr.message}` },
          { status: 500 }
        );
      }

      if (existingPago?.id_pago) {
        const id_pago = Number(existingPago.id_pago);
        const checkout_url = `/pago/iniciar?id_reserva=${id_reserva}&id_pago=${id_pago}`;
        const redirect_url = checkout_url;

        return NextResponse.json({
          ok: true,
          flow: "mp" as CheckoutFlow,
          payment_required: true,
          redirect_url,

          id_reserva,
          id_pago,
          expires_at,

          checkout_url, // compat
          reused_reserva: true,
          reused_pago: true,
          no_anticipo: false,

          ...commonMeta,
        });
      }

      // 5.2) Crear pago nuevo para la misma reserva
      const { data: pago, error: pErr } = await supabaseAdmin
        .from("reservas_pagos")
        .insert({
          id_reserva,
          id_club: draft.id_club,
          provider: "mercadopago",
          status: "created",
          amount: monto_anticipo,
          currency: "ARS",
          external_reference: String(id_reserva),
        })
        .select("id_pago")
        .single();

      if (pErr) {
        return NextResponse.json(
          { error: `Error creando registro de pago: ${pErr.message}` },
          { status: 500 }
        );
      }

      const id_pago = Number(pago?.id_pago);
      const checkout_url = `/pago/iniciar?id_reserva=${id_reserva}&id_pago=${id_pago}`;
      const redirect_url = checkout_url;

      return NextResponse.json({
        ok: true,
        flow: "mp" as CheckoutFlow,
        payment_required: true,
        redirect_url,

        id_reserva,
        id_pago,
        expires_at,

        checkout_url, // compat
        reused_reserva: true,
        reused_pago: false,
        no_anticipo: false,

        ...commonMeta,
      });
    }

    // 6) Crear reserva pendiente con RPC (concurrencia, anti-solape por EXCLUDE)
    const { data: created, error: rpcErr } = await supabaseAdmin.rpc("reservas_create_pending", {
      p_id_club: draft.id_club,
      p_id_cancha: draft.id_cancha,
      p_id_usuario: userId,
      p_fecha: draft.fecha,
      p_inicio: draft.inicio,
      p_fin: draft.fin,
      p_fin_dia_offset: fin_dia_offset,
      p_precio_total: precio_total,
      p_anticipo_porcentaje: pct,
      p_monto_anticipo: monto_anticipo,
      p_segmento: (calcJson?.segmento ?? draft.segmento ?? null) as any,
      p_id_tarifario: Number(calcJson?.id_tarifario ?? draft.id_tarifario ?? null),
      p_id_regla: Number(calcJson?.id_regla ?? draft.id_regla ?? null),
      p_hold_minutes: HOLD_MINUTES_DEFAULT,
    });

    if (rpcErr) {
      if (rpcErr.code === "23P01") {
        return NextResponse.json({ error: "Ese horario ya no está disponible" }, { status: 409 });
      }
      if (rpcErr.code === "P0001") {
        return NextResponse.json({ error: "No se pudo confirmar la reserva" }, { status: 409 });
      }
      return NextResponse.json(
        { error: "Error creando reserva pendiente", detail: { code: rpcErr.code, message: rpcErr.message } },
        { status: 500 }
      );
    }

    const row = Array.isArray(created) ? created[0] : created;
    if (!row?.id_reserva || !row?.expires_at) {
      return NextResponse.json({ error: "Respuesta inválida creando reserva" }, { status: 500 });
    }

    const id_reserva = Number(row.id_reserva);
    const expires_at = String(row.expires_at);

    // 7) Reutilizar pago activo (created/pending)
    const { data: existingPago2, error: exErr2 } = await supabaseAdmin
      .from("reservas_pagos")
      .select("id_pago,status")
      .eq("id_reserva", id_reserva)
      .in("status", ["created", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exErr2) {
      return NextResponse.json(
        { error: `Error verificando pagos existentes: ${exErr2.message}` },
        { status: 500 }
      );
    }

    if (existingPago2?.id_pago) {
      const id_pago = Number(existingPago2.id_pago);
      const checkout_url = `/pago/iniciar?id_reserva=${id_reserva}&id_pago=${id_pago}`;
      const redirect_url = checkout_url;

      return NextResponse.json({
        ok: true,
        flow: "mp" as CheckoutFlow,
        payment_required: true,
        redirect_url,

        id_reserva,
        id_pago,
        expires_at,

        checkout_url, // compat
        reused_reserva: false,
        reused_pago: true,
        no_anticipo: false,

        ...commonMeta,
      });
    }

    // 8) Crear registro de pago
    const { data: pago, error: pErr } = await supabaseAdmin
      .from("reservas_pagos")
      .insert({
        id_reserva,
        id_club: draft.id_club,
        provider: "mercadopago",
        status: "created",
        amount: monto_anticipo,
        currency: "ARS",
        external_reference: String(id_reserva),
      })
      .select("id_pago")
      .single();

    if (pErr) {
      return NextResponse.json(
        { error: `Error creando registro de pago: ${pErr.message}` },
        { status: 500 }
      );
    }

    const id_pago = Number(pago?.id_pago);
    const checkout_url = `/pago/iniciar?id_reserva=${id_reserva}&id_pago=${id_pago}`;
    const redirect_url = checkout_url;

    return NextResponse.json({
      ok: true,
      flow: "mp" as CheckoutFlow,
      payment_required: true,
      redirect_url,

      id_reserva,
      id_pago,
      expires_at,

      checkout_url, // compat
      reused_reserva: false,
      reused_pago: false,
      no_anticipo: false,

      ...commonMeta,
    });
  } catch (e: any) {
    console.error("[POST /api/reservas/checkout] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
