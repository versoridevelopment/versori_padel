import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Segmento = "publico" | "profe";

type SlotPoint = {
  absMin: number; // punto en minutos (puede ser >1440)
  time: string; // HH:MM (mod 24)
  dayOffset: 0 | 1; // 0 fecha base, 1 fecha+1 si absMin>=1440
  canStart: boolean; // puedo arrancar en este punto
  canEnd: boolean; // puedo terminar en este punto
  reason: null | "reservado" | "bloqueado";
  block_kind?: "cierre" | "reserva" | "hold" | "past"; // ✅ agregado
};

type DaySlots = {
  label: string;
  dateISO: string;
  id_tarifario: number;
  slots: SlotPoint[];
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
  inicio_ts: string;
  fin_ts: string;
};

type CierreDb = {
  id_cierre: number;
  id_club: number;
  id_cancha: number | null;
  fecha: string; // YYYY-MM-DD
  inicio: string | null; // HH:MM:SS | null
  fin: string | null; // HH:MM:SS | null
  fin_dia_offset: 0 | 1;
  activo: boolean;
  motivo: string | null;
};

// ---------- Helpers AR ----------
const TZ_AR = "America/Argentina/Buenos_Aires";

function todayISOAR() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_AR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nowMinutesAR() {
  // devuelve minutos desde 00:00 en horario AR
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ_AR,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hh * 60 + mm;
}

// ✅ cutoff “ATC”: siempre el PRÓXIMO cambio de hora
// 12:59 -> 13:00 (todavía permite 13-14)
// 13:00 -> 14:00 (bloquea 13-14 completo)
function cutoffNextHourFromNow(nowMin: number) {
  return (Math.floor(nowMin / 60) + 1) * 60;
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
  return d.getDay(); // 0=Dom..6=Sáb
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

function roundDownToHalfHour(min: number) {
  return Math.floor(min / 30) * 30;
}
function roundUpToHalfHour(min: number) {
  return Math.ceil(min / 30) * 30;
}

/**
 * Parse robusto AR: si viene sin TZ lo asumimos -03:00
 */
function parseTsAR(ts: string) {
  const s = String(ts || "");
  if (/[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s)) return new Date(s).getTime();
  return new Date(`${s}-03:00`).getTime();
}

// ---------- Resoluciones DB ----------
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

  if (error) return "publico";
  return data && data.length > 0 ? "profe" : "publico";
}

// ---------- Utilidad: intervalos ----------
type Interval = { start: number; end: number }; // minutos absolutos, end > start

function mergeIntervals(intervals: Interval[]) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const it of sorted) {
    if (!out.length) out.push({ ...it });
    else {
      const last = out[out.length - 1];
      if (it.start <= last.end) last.end = Math.max(last.end, it.end);
      else out.push({ ...it });
    }
  }
  return out;
}

function intervalCovers(intervals: Interval[], a: number, b: number) {
  return intervals.some((it) => it.start <= a && b <= it.end);
}

type Busy = {
  startMs: number;
  endMs: number;
  reason: "reservado" | "bloqueado";
  block_kind: "reserva" | "hold" | "cierre" | "past";
};

function overlapsInterval(busy: Busy[], aMs: number, bMs: number) {
  return busy.some((bi) => aMs < bi.endMs && bi.startMs < bMs);
}

function pointInsideBusyStrict(busy: Busy[], tMs: number) {
  for (const bi of busy) {
    if (bi.startMs < tMs && tMs < bi.endMs) return { reason: bi.reason, block_kind: bi.block_kind };
  }
  return null;
}

// ---------- Helpers cierres ----------
function dayNumberUTC(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function cierreToIntervalRel(c: CierreDb, baseFechaISO: string): Interval[] {
  if (!c.activo) return [];

  const dayDiff = dayNumberUTC(c.fecha) - dayNumberUTC(baseFechaISO);

  if (!c.inicio && !c.fin) {
    const start = dayDiff * 1440;
    const end = start + 1440;
    return [{ start, end }];
  }

  if (!c.inicio || !c.fin) return [];

  const startAbs = toMin(c.inicio);
  const endAbsBase = toMin(c.fin);
  const endAbs = endAbsBase + (c.fin_dia_offset ? 1440 : 0);

  if (endAbs === startAbs) {
    const start = dayDiff * 1440;
    const end = start + 1440;
    return [{ start, end }];
  }

  const start = startAbs + dayDiff * 1440;
  const end = endAbs + dayDiff * 1440;
  return [{ start, end }];
}

function inIntervals(intervals: Interval[], m: number) {
  for (const it of intervals) {
    if (it.start <= m && m < it.end) return true;
  }
  return false;
}

// ---------- API ----------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const id_club = Number(searchParams.get("id_club"));
    const id_cancha = Number(searchParams.get("id_cancha"));
    const fecha_desde = searchParams.get("fecha_desde") || todayISOAR();
    const dias = Number(searchParams.get("dias") || 7);

    if (!id_club || Number.isNaN(id_club))
      return NextResponse.json({ error: "id_club es requerido" }, { status: 400 });
    if (!id_cancha || Number.isNaN(id_cancha))
      return NextResponse.json({ error: "id_cancha es requerido" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_desde))
      return NextResponse.json({ error: "fecha_desde inválida (YYYY-MM-DD)" }, { status: 400 });
    if (Number.isNaN(dias) || dias < 1 || dias > 14)
      return NextResponse.json({ error: "dias inválido (1..14)" }, { status: 400 });

    const tar = await resolveTarifarioId({ id_club, id_cancha });
    if ("error" in tar) return NextResponse.json({ error: tar.error }, { status: 400 });
    const id_tarifario = tar.id_tarifario;

    const segmento = await resolveSegmento(id_club);

    // Ventana de búsqueda reservas (AR)
    const windowStartMs = new Date(arMidnightISO(fecha_desde)).getTime();
    const windowEndMs = new Date(arMidnightISO(addDaysISO(fecha_desde, dias + 1))).getTime();
    const nowMs = Date.now();

    // --- reservas ---
    const { data: reservasRaw, error: resErr } = await supabaseAdmin
      .from("reservas")
      .select("id_reserva,estado,expires_at,inicio_ts,fin_ts")
      .eq("id_club", id_club)
      .eq("id_cancha", id_cancha)
      .in("estado", ["confirmada", "pendiente_pago"])
      .lt("inicio_ts", new Date(windowEndMs).toISOString())
      .gt("fin_ts", new Date(windowStartMs).toISOString());

    if (resErr) return NextResponse.json({ error: `Error leyendo reservas: ${resErr.message}` }, { status: 500 });

    const reservas = (reservasRaw || []) as ReservaDb[];

    const busyFromReservas: Busy[] = reservas
      .map((r) => {
        const startMs = parseTsAR(r.inicio_ts);
        const endMs = parseTsAR(r.fin_ts);
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;

        if (r.estado === "confirmada") {
          return { startMs, endMs, reason: "reservado" as const, block_kind: "reserva" as const };
        }

        const expMs = r.expires_at ? new Date(r.expires_at).getTime() : NaN;
        const vigente = Number.isFinite(expMs) ? expMs > nowMs : false;
        if (!vigente) return null;

        return { startMs, endMs, reason: "bloqueado" as const, block_kind: "hold" as const };
      })
      .filter(Boolean) as Busy[];

    // --- cierres ---
    const fechaMenos = addDaysISO(fecha_desde, -1);
    const fechaHasta = addDaysISO(fecha_desde, dias + 1);

    const { data: cierresRaw, error: cErr } = await supabaseAdmin
      .from("club_cierres")
      .select("id_cierre,id_club,id_cancha,fecha,inicio,fin,fin_dia_offset,activo,motivo")
      .eq("id_club", id_club)
      .gte("fecha", fechaMenos)
      .lte("fecha", fechaHasta)
      .eq("activo", true)
      .or(`id_cancha.is.null,id_cancha.eq.${id_cancha}`);

    if (cErr) return NextResponse.json({ error: `Error leyendo cierres: ${cErr.message}` }, { status: 500 });

    const cierres = (cierresRaw || []) as CierreDb[];

    const cierreIntervalsRel = mergeIntervals(cierres.flatMap((c) => cierreToIntervalRel(c, fecha_desde)));

    const busyFromCierres: Busy[] = [];
    for (const c of cierres) {
      const intervalsRel = cierreToIntervalRel(c, fecha_desde);
      for (const it of intervalsRel) {
        const startMs = windowStartMs + it.start * 60_000;
        const endMs = windowStartMs + it.end * 60_000;
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
          busyFromCierres.push({
            startMs,
            endMs,
            reason: "bloqueado",
            block_kind: "cierre",
          });
        }
      }
    }

    const outDays: DaySlots[] = [];

    // ✅ para “bloquear horas corridas”
    const today = todayISOAR();
    const nowMinAR = nowMinutesAR();
    const cutoffTodayMin = cutoffNextHourFromNow(nowMinAR); // ej 13:00=>840? NO, 13:00=>840? (13*60=780) => (13+1)*60=840

    for (let i = 0; i < dias; i++) {
      const fecha = addDaysISO(fecha_desde, i);
      const dow = dowFromISO(fecha);

      // --- reglas ---
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

      if (rErr) return NextResponse.json({ error: `Error leyendo reglas: ${rErr.message}` }, { status: 500 });

      const rules = (reglas || []) as ReglaDb[];

      const durations_allowed = Array.from(new Set(rules.map((r) => Number(r.duracion_min))))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);

      const allowedRaw: Interval[] = [];
      let minStart = Infinity;
      let maxEnd = 0;

      for (const r of rules) {
        const start = toMin(r.hora_desde);
        const endBase = toMin(r.hora_hasta);
        const crosses = !!r.cruza_medianoche || endBase <= start;
        const end = crosses ? endBase + 1440 : endBase;

        minStart = Math.min(minStart, start);
        maxEnd = Math.max(maxEnd, end);
        allowedRaw.push({ start, end });
      }

      if (minStart === Infinity) {
        outDays.push({
          label: dayLabel(fecha, i),
          dateISO: fecha,
          id_tarifario,
          slots: [],
          durations_allowed: durations_allowed.length ? durations_allowed : [60, 90, 120],
          segmento,
        });
        continue;
      }

      minStart = roundDownToHalfHour(minStart);
      maxEnd = roundUpToHalfHour(maxEnd);
      if (maxEnd <= minStart) {
        minStart = 8 * 60;
        maxEnd = 26 * 60;
      }

      const allowed = mergeIntervals(allowedRaw);

      const dayStartMs = new Date(arMidnightISO(fecha)).getTime();
      const dayOffsetRel = i * 1440;

      // ✅ busy base (reservas + cierres)
      const busyIntervals: Busy[] = [...busyFromReservas, ...busyFromCierres];

      // ✅ Agregamos “past” SOLO para el día de HOY
      // Bloquea [00:00 .. cutoffNextHour)
      const isToday = fecha === today;
      if (isToday) {
        const startMs = dayStartMs + 0 * 60_000;
        const endMs = dayStartMs + cutoffTodayMin * 60_000;

        if (endMs > startMs) {
          busyIntervals.push({
            startMs,
            endMs,
            reason: "bloqueado",
            block_kind: "past",
          });
        }
      }

      const points: SlotPoint[] = [];

      for (let m = minStart; m <= maxEnd; m += 30) {
        const dayOffset = (m >= 1440 ? 1 : 0) as 0 | 1;
        const pointMs = dayStartMs + m * 60_000;

        const nextA = m;
        const nextB = m + 30;
        const prevA = m - 30;
        const prevB = m;

        const nextSegAllowed = intervalCovers(allowed, nextA, nextB);
        const prevSegAllowed = intervalCovers(allowed, prevA, prevB);

        const nextSegFreeBusy =
          nextSegAllowed &&
          !overlapsInterval(busyIntervals, dayStartMs + nextA * 60_000, dayStartMs + nextB * 60_000);

        const prevSegFreeBusy =
          prevSegAllowed &&
          !overlapsInterval(busyIntervals, dayStartMs + prevA * 60_000, dayStartMs + prevB * 60_000);

        // cierres por punto (prioridad alta)
        const mRel = dayOffsetRel + m;
        const isClosedPoint = inIntervals(cierreIntervalsRel, mRel);

        const nextSegClosed =
          inIntervals(cierreIntervalsRel, dayOffsetRel + nextA) ||
          inIntervals(cierreIntervalsRel, dayOffsetRel + (nextB - 1e-6));

        const prevSegClosed =
          inIntervals(cierreIntervalsRel, dayOffsetRel + (prevA + 1e-6)) ||
          inIntervals(cierreIntervalsRel, dayOffsetRel + (prevB - 1e-6));

        const canStart = !!nextSegFreeBusy && !nextSegClosed;
        const canEnd = !!prevSegFreeBusy && !prevSegClosed;

        // reason (UI):
        // - cierre => bloqueado/cierre
        // - sino busy strict (reserva/hold/past)
        let reason: SlotPoint["reason"] = null;
        let block_kind: SlotPoint["block_kind"] = undefined;

        if (isClosedPoint) {
          reason = "bloqueado";
          block_kind = "cierre";
        } else {
          const rr = pointInsideBusyStrict(busyIntervals, pointMs);
          if (rr) {
            reason = rr.reason;
            block_kind = rr.block_kind;
          }
        }

        points.push({
          absMin: m,
          time: minToHHMM(m),
          dayOffset,
          canStart,
          canEnd,
          reason,
          block_kind,
        });
      }

      outDays.push({
        label: dayLabel(fecha, i),
        dateISO: fecha,
        id_tarifario,
        slots: points,
        durations_allowed: durations_allowed.length ? durations_allowed : [60, 90, 120],
        segmento,
      });
    }

    const res = NextResponse.json({
      ok: true,
      id_club,
      id_cancha,
      id_tarifario,
      fecha_desde,
      dias,
      segmento,
      days: outDays,
    });

    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (e: any) {
    console.error("[GET /api/reservas/slots] ex:", e);
    const res = NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  }
}
