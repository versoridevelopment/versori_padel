import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COOKIE_NAME = "reserva_draft_v1";

type DraftSnapshot = {
  id_club: number;
  id_cancha: number;
  user_id: string | null;
  segmento: "publico" | "profe";
  fecha: string; // YYYY-MM-DD
  inicio: string; // HH:MM
  fin: string; // HH:MM
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

function toMin(hhmm: string) {
  const [hStr, mStr] = (hhmm || "").slice(0, 5).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

export async function GET(req: Request) {
  try {
    const draft = readDraftFromCookie(req);
    if (!draft) {
      return NextResponse.json({ ok: false, reason: "no_draft" }, { status: 200 });
    }

    // Usuario logueado (restauramos solo el hold propio)
    const supabase = await getSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    if (!userId) {
      return NextResponse.json({ ok: false, reason: "not_logged" }, { status: 200 });
    }

    const iniMin = toMin(draft.inicio);
    const finMin = toMin(draft.fin);
    if (!Number.isFinite(iniMin) || !Number.isFinite(finMin)) {
      return NextResponse.json({ ok: false, reason: "bad_time" }, { status: 200 });
    }
    const fin_dia_offset: 0 | 1 = finMin <= iniMin ? 1 : 0;

    const nowIso = new Date().toISOString();

    // 1) Buscar reserva pendiente vigente del mismo usuario/slot
    const { data: reserva, error: rErr } = await supabaseAdmin
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rErr) {
      return NextResponse.json(
        { ok: false, reason: "db_reserva_error", detail: rErr.message },
        { status: 200 }
      );
    }

    if (!reserva?.id_reserva) {
      return NextResponse.json({ ok: false, reason: "no_hold" }, { status: 200 });
    }

    const expiresAtMs = reserva.expires_at ? new Date(reserva.expires_at).getTime() : NaN;
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return NextResponse.json({ ok: false, reason: "expired" }, { status: 200 });
    }

    const id_reserva = Number(reserva.id_reserva);
    const expires_at = String(reserva.expires_at);

    // 2) Buscar pago activo para esa reserva
    const { data: pago, error: pErr } = await supabaseAdmin
      .from("reservas_pagos")
      .select("id_pago,status")
      .eq("id_reserva", id_reserva)
      .in("status", ["created", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json(
        { ok: false, reason: "db_pago_error", detail: pErr.message },
        { status: 200 }
      );
    }

    if (!pago?.id_pago) {
      return NextResponse.json({ ok: false, reason: "no_pago" }, { status: 200 });
    }

    const id_pago = Number(pago.id_pago);
    const checkout_url = `/pago/iniciar?id_reserva=${id_reserva}&id_pago=${id_pago}`;

    return NextResponse.json(
      {
        ok: true,
        id_reserva,
        id_pago,
        expires_at,
        checkout_url,
        fin_dia_offset,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[GET /api/reservas/checkout/restore] ex:", e);
    return NextResponse.json({ ok: false, reason: "error", detail: e?.message }, { status: 200 });
  }
}
