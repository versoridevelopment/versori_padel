import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Segmento = "publico" | "profe";

type Slot = {
  absMin: number;
  time: string;
  dayOffset: 0 | 1;
  available: boolean;
  reason: null | "reservado" | "bloqueado";
};

type DaySlots = {
  label: string;
  dateISO: string;
  id_tarifario: number;
  slots: Slot[];
  durations_allowed: number[];
  segmento: Segmento;
};

type ReglaDb = {
  id_regla: number;
  id_tarifario: number;
  segmento: string;
  dow: number | null;
  hora_desde: string;
  hora_hasta: string;
  cruza_medianoche: boolean;
  duracion_min: number;
  activo: boolean;
  vigente_desde: string;
  vigente_hasta: string | null;
};

type ReservaDb = {
  id_reserva: number;
  estado: string;
  expires_at: string | null;
  inicio_ts: string; // timestamptz
  fin_ts: string; // timestamptz
};

function todayISOAR() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function arMidnightISO(dateISO: string) {
  return `${dateISO}T00:00:00-03:00`;
}

function addDaysISO(dateISO: string, addDays: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + addDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function dayLabel(dateISO: string, idx: number) {
  if (idx === 0) return "Hoy";
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function dowFromISO(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.getDay();
}

function toMin(hhmmss: string) {
  const s = (hhmmss || "").slice(0, 5);
  const [h, m] = s.split(":").map((x) => Number(x));
  return h * 60 + (m || 0);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minToHHMM(absMin: number) {
  const m = ((absMin % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function uniqSortAbs(slots: Slot[]) {
  const map = new Map<number, Slot>();
  for (const s of slots) map.set(s.absMin, s);
  return Array.from(map.values()).sort((a, b) => a.absMin - b.absMin);
}

async function resolveTarifarioId(params: { id_club: number; id_cancha: number }) {
  const { data: cancha, error: cErr } = await supabaseAdmin
    .from("canchas")
    .select("id_cancha, id_club, id_tarifario, id_tipo_cancha")
    .eq("id_cancha", params.id_cancha)
    .eq("id_club", params.id_club)
    .maybeSingle();

  if (cErr) throw new Error(`Error leyendo cancha: ${cErr.message}`);
  if (!cancha) return { error: "Cancha no encontrada" as const };

  if (cancha.id_tarifario) return { id_tarifario: Number(cancha.id_tarifario) };

  if (cancha.id_tipo_cancha) {
    const { data: def, error: dErr } = await supabaseAdmin
      .from("club_tarifarios_default")
      .select("id_tarifario")
      .eq("id_club", params.id_club)
      .eq("id_tipo_cancha", cancha.id_tipo_cancha)
      .maybeSingle();

    if (dErr) throw new Error(`Error leyendo tarifario default: ${dErr.message}`);
    if (def?.id_tarifario) return { id_tarifario: Number(def.id_tarifario) };
  }

  return { error: "La cancha no tiene tarifario asignado" as const };
}

async function resolveSegmento(id_club: number): Promise<Segmento> {
  const supabase = await getSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) return "publico";

  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("id_usuario, roles!inner(nombre)")
    .eq("id_club", id_club)
    .eq("id_usuario", userId)
    .eq("roles.nombre", "profe")
    .limit(1);

  if (error) {
    console.error("[resolveSegmento] error:", error);
    return "publico";
  }

  return data && data.length > 0 ? "profe" : "publico";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const id_club = Number(searchParams.get("id_club"));
    const id_cancha = Number(searchParams.get("id_cancha"));
    const fecha_desde = searchParams.get("fecha_desde") || todayISOAR();
    const dias = Number(searchParams.get("dias") || 7);
    const debug = searchParams.get("debug") === "1";

    if (!id_club || Number.isNaN(id_club)) {
      return NextResponse.json({ error: "id_club es requerido" }, { status: 400 });
    }
    if (!id_cancha || Number.isNaN(id_cancha)) {
      return NextResponse.json({ error: "id_cancha es requerido" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_desde)) {
      return NextResponse.json({ error: "fecha_desde inválida (YYYY-MM-DD)" }, { status: 400 });
    }
    if (Number.isNaN(dias) || dias < 1 || dias > 14) {
      return NextResponse.json({ error: "dias inválido (1..14)" }, { status: 400 });
    }

    const tar = await resolveTarifarioId({ id_club, id_cancha });
    if ("error" in tar) return NextResponse.json({ error: tar.error }, { status: 400 });
    const id_tarifario = tar.id_tarifario;

    const segmento = await resolveSegmento(id_club);

    // Ventana de búsqueda de reservas
    const windowStartMs = new Date(arMidnightISO(fecha_desde)).getTime();
    const windowEndMs = new Date(arMidnightISO(addDaysISO(fecha_desde, dias + 1))).getTime();
    const nowMs = Date.now();

    const { data: reservasRaw, error: resErr } = await supabaseAdmin
      .from("reservas")
      .select("id_reserva,estado,expires_at,inicio_ts,fin_ts")
      .eq("id_club", id_club)
      .eq("id_cancha", id_cancha)
      .in("estado", ["confirmada", "pendiente_pago"])
      .lt("inicio_ts", new Date(windowEndMs).toISOString())
      .gt("fin_ts", new Date(windowStartMs).toISOString());

    if (resErr) {
      return NextResponse.json({ error: `Error leyendo reservas: ${resErr.message}` }, { status: 500 });
    }

    const reservas = (reservasRaw || []) as ReservaDb[];

    const busyIntervals = reservas
      .map((r) => {
        const startMs = new Date(r.inicio_ts).getTime();
        const endMs = new Date(r.fin_ts).getTime();
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;

        if (r.estado === "confirmada") {
          return { startMs, endMs, reason: "reservado" as const, id_reserva: r.id_reserva };
        }

        const expMs = r.expires_at ? new Date(r.expires_at).getTime() : NaN;
        const vigente = Number.isFinite(expMs) ? expMs > nowMs : false;
        if (!vigente) return null;

        return { startMs, endMs, reason: "bloqueado" as const, id_reserva: r.id_reserva };
      })
      .filter(Boolean) as { startMs: number; endMs: number; reason: "reservado" | "bloqueado"; id_reserva: number }[];

    const outDays: DaySlots[] = [];

    for (let i = 0; i < dias; i++) {
      const fecha = addDaysISO(fecha_desde, i);
      const dow = dowFromISO(fecha);

      const { data: reglas, error: rErr } = await supabaseAdmin
        .from("canchas_tarifas_reglas")
        .select(
          "id_regla,id_tarifario,segmento,dow,hora_desde,hora_hasta,cruza_medianoche,duracion_min,activo,vigente_desde,vigente_hasta"
        )
        .eq("id_tarifario", id_tarifario)
        .eq("activo", true)
        .eq("segmento", segmento)
        .or(`dow.is.null,dow.eq.${dow}`)
        .lte("vigente_desde", fecha)
        .or(`vigente_hasta.is.null,vigente_hasta.gte.${fecha}`);

      if (rErr) {
        return NextResponse.json({ error: `Error leyendo reglas: ${rErr.message}` }, { status: 500 });
      }

      const rules = (reglas || []) as ReglaDb[];

      const durations_allowed = Array.from(new Set(rules.map((r) => Number(r.duracion_min))))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);

      const dayStartMs = new Date(arMidnightISO(fecha)).getTime();
      const slotsRaw: Slot[] = [];

      for (const r of rules) {
        const start = toMin(r.hora_desde);
        const endBase = toMin(r.hora_hasta);

        const crosses = !!r.cruza_medianoche || endBase <= start;
        const end = crosses ? endBase + 1440 : endBase;

        for (let m = start; m <= end; m += 30) {
          const dayOffset = (m >= 1440 ? 1 : 0) as 0 | 1;

          const slotMs = dayStartMs + m * 60_000;
          const slotEndMs = slotMs + 30 * 60_000;

          let available = true;
          let reason: Slot["reason"] = null;

          // Overlap robusto
          for (const bi of busyIntervals) {
            if (slotMs < bi.endMs && bi.startMs < slotEndMs) {
              available = false;
              reason = bi.reason;
              break;
            }
          }

          slotsRaw.push({
            absMin: m,
            time: minToHHMM(m),
            dayOffset,
            available,
            reason,
          });
        }
      }

      const slots = uniqSortAbs(slotsRaw).map((s) => ({
        absMin: s.absMin,
        time: s.time,
        dayOffset: s.dayOffset,
        available: !!s.available,
        reason: s.reason ?? null,
      }));

      outDays.push({
        label: dayLabel(fecha, i),
        dateISO: fecha,
        id_tarifario,
        slots,
        durations_allowed: durations_allowed.length ? durations_allowed : [60, 90, 120],
        segmento,
      });
    }

    const body: any = {
      ok: true,
      id_club,
      id_cancha,
      id_tarifario,
      fecha_desde,
      dias,
      segmento,
      days: outDays,
    };

    // Debug para comparar PROD vs LOCAL (mirá inicio_ts/fin_ts reales)
    if (debug) {
      body.debug = {
        windowStartISO: new Date(windowStartMs).toISOString(),
        windowEndISO: new Date(windowEndMs).toISOString(),
        reservasRaw: reservas,
        busyIntervals,
        nowISO: new Date(nowMs).toISOString(),
      };
    }

    const res = NextResponse.json(body);

    // Anti-cache fuerte
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    return res;
  } catch (e: any) {
    console.error("[GET /api/reservas/slots] ex:", e);
    const res = NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    return res;
  }
}
