import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COOKIE_NAME = "reserva_draft_v1";
const HOLD_MINUTES_DEFAULT = 10;

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

export async function POST(req: Request) {
  try {
    const draft = readDraftFromCookie(req);
    if (!draft) {
      return NextResponse.json({ error: "No hay draft de reserva" }, { status: 400 });
    }

    // 0) Determinar fin_dia_offset (cruce de medianoche)
    // Regla: si fin <= inicio => termina al día siguiente (offset 1)
    const iniMin = toMin(draft.inicio);
    const finMin = toMin(draft.fin);

    if (!Number.isFinite(iniMin) || !Number.isFinite(finMin)) {
      return NextResponse.json({ error: "Horario inválido en draft" }, { status: 400 });
    }

    const fin_dia_offset: 0 | 1 = finMin <= iniMin ? 1 : 0;

    // 1) Obtener usuario real (no confiar en draft.user_id)
    const supabase = await getSupabaseServerClient();
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    // 2) Recalcular precio server-side (anti-manipulación)
    // Nota: tu calcular-precio ya debe soportar cruces (23:30-01:30) a nivel de cálculo.
    const calcRes = await fetch(new URL("/api/reservas/calcular-precio", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        id_club: draft.id_club,
        id_cancha: draft.id_cancha,
        fecha: draft.fecha, // fecha del inicio
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

    // 3) Leer anticipo_porcentaje del club
    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, anticipo_porcentaje")
      .eq("id_club", draft.id_club)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json({ error: `Error leyendo club: ${cErr.message}` }, { status: 500 });
    }
    if (!club) {
      return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });
    }

    const anticipo_porcentaje = Number(club.anticipo_porcentaje ?? 50);
    const pct = Math.min(100, Math.max(0, anticipo_porcentaje));
    const monto_anticipo = round2(precio_total * (pct / 100));

    // 4) Concurrencia atómica: insertar pendiente_pago si no hay solapamiento
    // IMPORTANTE: RPC actualizado para recibir p_fin_dia_offset
    const { data: created, error: rpcErr } = await supabaseAdmin.rpc("reservas_create_pending", {
      p_id_club: draft.id_club,
      p_id_cancha: draft.id_cancha,
      p_id_usuario: userId, // puede ser null si permitís invitados
      p_fecha: draft.fecha, // fecha del inicio
      p_inicio: draft.inicio,
      p_fin: draft.fin,
      p_fin_dia_offset: fin_dia_offset, // ✅ NUEVO
      p_precio_total: precio_total,
      p_anticipo_porcentaje: pct,
      p_monto_anticipo: monto_anticipo,
      p_segmento: (calcJson?.segmento ?? draft.segmento ?? null) as any,
      p_id_tarifario: Number(calcJson?.id_tarifario ?? draft.id_tarifario ?? null),
      p_id_regla: Number(calcJson?.id_regla ?? draft.id_regla ?? null),
      p_hold_minutes: HOLD_MINUTES_DEFAULT,
    });

    if (rpcErr) {
      const msg = rpcErr.message || "";

      // Mapeo explícito del “TURNOS_SOLAPADOS”
      if (msg.includes("TURNOS_SOLAPADOS")) {
        return NextResponse.json({ error: "Ese horario ya no está disponible" }, { status: 409 });
      }

      // Si todavía te aparece, es que NO actualizaste SQL/constraints
      if (msg.toLowerCase().includes("rango inválido") || msg.includes("fin <= inicio")) {
        return NextResponse.json(
          { error: "Rango inválido. Verificá cruce de medianoche y fin_dia_offset en DB/RPC.", detail: msg },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: `Error creando reserva pendiente: ${msg}` }, { status: 500 });
    }

    const row = Array.isArray(created) ? created[0] : created;
    if (!row?.id_reserva || !row?.expires_at) {
      return NextResponse.json({ error: "Respuesta inválida creando reserva" }, { status: 500 });
    }

    const id_reserva = Number(row.id_reserva);
    const expires_at = String(row.expires_at);

    // 5) Crear checkout en el proveedor de pagos (placeholder)
    // Ideal: en MercadoPago/Stripe, usar external_reference = id_reserva y amount = monto_anticipo.
    const checkout_url = `/pago/iniciar?id_reserva=${id_reserva}`;

    return NextResponse.json({
      ok: true,
      id_reserva,
      expires_at,
      precio_total,
      anticipo_porcentaje: pct,
      monto_anticipo,
      checkout_url,
      // Opcional para debug/UI:
      fin_dia_offset,
    });
  } catch (e: any) {
    console.error("[POST /api/reservas/checkout] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
