import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  id_club: number;
  id_cancha: number;
  fecha: string; // YYYY-MM-DD (fecha REAL del inicio)
  inicio: string; // HH:MM
  fin: string; // HH:MM
};

type Segmento = "publico" | "profe";

type Regla = {
  id_regla: number;
  id_tarifario: number;
  segmento: Segmento;
  dow: number | null;
  vigente_desde: string;
  vigente_hasta: string | null;
  hora_desde: string;
  hora_hasta: string;
  cruza_medianoche: boolean;
  duracion_min: number;
  precio: number;
  prioridad: number;
  activo: boolean;
};

function toMin(hhmm: string) {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return h * 60 + (m || 0);
}

function weekday0Sun(fechaISO: string) {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.getDay(); // 0..6
}

function timeToMinFromDB(hms: string) {
  return toMin((hms || "").slice(0, 5));
}

function addDaysISO(dateISO: string, add: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + add);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ¿inicio cae dentro de ventana?
function startInWindow(params: {
  startMin: number; // 0..1439
  fromMin: number; // 0..1439
  toMin: number; // 0..1439
  cruza_medianoche: boolean;
}) {
  const { startMin, fromMin, toMin, cruza_medianoche } = params;
  const crosses = cruza_medianoche || toMin <= fromMin;
  if (!crosses) return startMin >= fromMin && startMin < toMin;
  return startMin >= fromMin || startMin < toMin;
}

function pickBestRuleForStart(params: {
  reglas: Regla[];
  startMinInDay: number; // 0..1439
  dow: number; // 0..6
}) {
  const { reglas, startMinInDay, dow } = params;

  const matches = reglas.filter((r) => {
    if (r.dow !== null && Number(r.dow) !== dow) return false;
    const from = timeToMinFromDB(r.hora_desde);
    const to = timeToMinFromDB(r.hora_hasta);
    return startInWindow({
      startMin: startMinInDay,
      fromMin: from,
      toMin: to,
      cruza_medianoche: !!r.cruza_medianoche,
    });
  });

  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    if (Number(b.prioridad) !== Number(a.prioridad)) return Number(b.prioridad) - Number(a.prioridad);
    const aSpec = a.dow === null ? 0 : 1;
    const bSpec = b.dow === null ? 0 : 1;
    return bSpec - aSpec;
  });

  return matches[0];
}

async function resolveSegmentoForUser(params: {
  userId: string | null;
  id_club: number;
}): Promise<Segmento> {
  const { userId, id_club } = params;
  if (!userId) return "publico";

  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("id_usuario,id_club,roles!inner(nombre)")
    .eq("id_usuario", userId)
    .eq("id_club", id_club)
    .eq("roles.nombre", "profe")
    .limit(1);

  if (error) {
    console.error("[resolveSegmentoForUser] error:", error);
    return "publico";
  }

  return (data || []).length > 0 ? "profe" : "publico";
}

async function resolveTarifarioId(id_club: number, id_cancha: number) {
  const { data: cancha, error: cErr } = await supabaseAdmin
    .from("canchas")
    .select("id_cancha,id_club,id_tipo_cancha,id_tarifario")
    .eq("id_cancha", id_cancha)
    .eq("id_club", id_club)
    .maybeSingle();

  if (cErr) throw cErr;
  if (!cancha) return { error: "Cancha no encontrada para este club" as const };

  if (cancha.id_tarifario) {
    return { id_tarifario: Number(cancha.id_tarifario), id_tipo_cancha: Number(cancha.id_tipo_cancha) };
  }

  const { data: def, error: dErr } = await supabaseAdmin
    .from("club_tarifarios_default")
    .select("id_tarifario")
    .eq("id_club", id_club)
    .eq("id_tipo_cancha", cancha.id_tipo_cancha)
    .maybeSingle();

  if (dErr) throw dErr;

  if (def?.id_tarifario) {
    return { id_tarifario: Number(def.id_tarifario), id_tipo_cancha: Number(cancha.id_tipo_cancha) };
  }

  return { error: "No hay tarifario asignado (cancha ni default por tipo)" as const };
}

async function fetchReglas(params: {
  id_tarifario: number;
  segmento: Segmento;
  duracion_min: number;
  fechaISO: string;
}) {
  const { id_tarifario, segmento, duracion_min, fechaISO } = params;

  const { data, error } = await supabaseAdmin
    .from("canchas_tarifas_reglas")
    .select("*")
    .eq("id_tarifario", id_tarifario)
    .eq("segmento", segmento)
    .eq("duracion_min", duracion_min)
    .eq("activo", true)
    .lte("vigente_desde", fechaISO)
    .or(`vigente_hasta.is.null,vigente_hasta.gte.${fechaISO}`)
    .order("prioridad", { ascending: false });

  if (error) throw error;
  return (data || []) as Regla[];
}

function fmtHHMM(minInDay: number) {
  const hh = String(Math.floor(minInDay / 60)).padStart(2, "0");
  const mm = String(minInDay % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Calcula costo mínimo para un tramo homogéneo de N steps de 30 min,
 * manteniendo descuentos del tarifario:
 * - 30 => (precio60 / 2)
 * - 60 => precio60
 * - 90 => precio90
 * - 120 => precio120
 *
 * Usamos DP sobre steps (N <= 4 en tu caso real, pero lo dejamos genérico).
 */
function minCostForGroup(params: {
  steps: number; // cada step=30 min
  price60: number;
  price90?: number | null;
  price120?: number | null;
}) {
  const { steps, price60, price90, price120 } = params;

  const INF = 1e18;
  const dp = new Array<number>(steps + 1).fill(INF);
  const prev = new Array<{ from: number; take: number; cost: number } | null>(steps + 1).fill(null);
  dp[0] = 0;

  // costos por pieza (en steps)
  const pieceCosts: Array<{ take: number; cost: number; label: "30" | "60" | "90" | "120" }> = [
    { take: 1, cost: price60 / 2, label: "30" },
    { take: 2, cost: price60, label: "60" },
  ];

  if (price90 != null) pieceCosts.push({ take: 3, cost: price90, label: "90" });
  if (price120 != null) pieceCosts.push({ take: 4, cost: price120, label: "120" });

  for (let i = 0; i <= steps; i++) {
    if (dp[i] >= INF) continue;
    for (const p of pieceCosts) {
      const j = i + p.take;
      if (j > steps) continue;
      const v = dp[i] + p.cost;
      if (v < dp[j]) {
        dp[j] = v;
        prev[j] = { from: i, take: p.take, cost: p.cost };
      }
    }
  }

  if (dp[steps] >= INF) return { ok: false as const, cost: 0, pieces: [] as any[] };

  // reconstrucción de piezas (solo para debug/breakdown)
  const pieces: Array<{ takeSteps: number; cost: number }> = [];
  let cur = steps;
  while (cur > 0) {
    const p = prev[cur];
    if (!p) break;
    pieces.push({ takeSteps: p.take, cost: p.cost });
    cur = p.from;
  }
  pieces.reverse();

  return { ok: true as const, cost: dp[steps], pieces };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const id_club = Number(body?.id_club);
    const id_cancha = Number(body?.id_cancha);
    const fecha = String(body?.fecha || "");
    const inicio = String(body?.inicio || "");
    const fin = String(body?.fin || "");

    if (!id_club || Number.isNaN(id_club)) {
      return NextResponse.json({ error: "id_club es requerido y numérico" }, { status: 400 });
    }
    if (!id_cancha || Number.isNaN(id_cancha)) {
      return NextResponse.json({ error: "id_cancha es requerido y numérico" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ error: "fecha debe ser YYYY-MM-DD" }, { status: 400 });
    }
    if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fin)) {
      return NextResponse.json({ error: "inicio/fin deben ser HH:MM" }, { status: 400 });
    }

    const startMin = toMin(inicio);
    let endMin = toMin(fin);
    if (endMin <= startMin) endMin += 1440;

    const duracion_min = endMin - startMin;
    if (![60, 90, 120].includes(duracion_min)) {
      return NextResponse.json({ error: "Duración no soportada (60/90/120)", duracion_min }, { status: 400 });
    }

    // auth + segmento
    const sb = await getSupabaseServerClient();
    const { data: auth } = await sb.auth.getUser();
    const userId = auth?.user?.id ?? null;
    const segmento = await resolveSegmentoForUser({ userId, id_club });

    // tarifario
    const resolved = await resolveTarifarioId(id_club, id_cancha);
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: 409 });
    const id_tarifario = resolved.id_tarifario;

    const STEP_MIN = 30;
    const needsNextDay = endMin > 1440;

    const fecha0 = fecha;
    const dow0 = weekday0Sun(fecha0);
    const fecha1 = needsNextDay ? addDaysISO(fecha0, 1) : null;
    const dow1 = needsNextDay ? (dow0 + 1) % 7 : null;

    // Traemos reglas por duración (60/90/120) para ambos días (si aplica)
    const reglas60_0 = await fetchReglas({ id_tarifario, segmento, duracion_min: 60, fechaISO: fecha0 });
    const reglas90_0 = await fetchReglas({ id_tarifario, segmento, duracion_min: 90, fechaISO: fecha0 });
    const reglas120_0 = await fetchReglas({ id_tarifario, segmento, duracion_min: 120, fechaISO: fecha0 });

    const reglas60_1 = needsNextDay && fecha1 ? await fetchReglas({ id_tarifario, segmento, duracion_min: 60, fechaISO: fecha1 }) : [];
    const reglas90_1 = needsNextDay && fecha1 ? await fetchReglas({ id_tarifario, segmento, duracion_min: 90, fechaISO: fecha1 }) : [];
    const reglas120_1 = needsNextDay && fecha1 ? await fetchReglas({ id_tarifario, segmento, duracion_min: 120, fechaISO: fecha1 }) : [];

    const getRuleAt = (tAbs: number, reglas0: Regla[], reglas1: Regla[]) => {
      if (tAbs < 1440) return pickBestRuleForStart({ reglas: reglas0, startMinInDay: tAbs, dow: dow0 });
      if (!needsNextDay || dow1 === null) return null;
      return pickBestRuleForStart({ reglas: reglas1, startMinInDay: tAbs - 1440, dow: dow1 });
    };

    const rule60At = (tAbs: number) => getRuleAt(tAbs, reglas60_0, reglas60_1);
    const rule90At = (tAbs: number) => getRuleAt(tAbs, reglas90_0, reglas90_1);
    const rule120At = (tAbs: number) => getRuleAt(tAbs, reglas120_0, reglas120_1);

    // Armamos grupos homogéneos según la regla de 60 (eso define “la tarifa vigente”)
    type Group = { startAbs: number; endAbs: number; rule60: Regla };
    const groups: Group[] = [];

    let t = startMin;
    let curRule60 = rule60At(t);
    if (!curRule60) {
      return NextResponse.json({ error: "Faltan reglas de 60 min para cubrir el inicio" }, { status: 409 });
    }
    let curStart = t;

    for (; t < endMin; t += STEP_MIN) {
      const r = rule60At(t);
      if (!r) {
        return NextResponse.json({ error: "Faltan reglas de 60 min para cubrir un tramo del turno", tramo_abs: t }, { status: 409 });
      }
      if (r.id_regla !== curRule60.id_regla) {
        groups.push({ startAbs: curStart, endAbs: t, rule60: curRule60 });
        curRule60 = r;
        curStart = t;
      }
    }
    groups.push({ startAbs: curStart, endAbs: endMin, rule60: curRule60 });

    // Si solo hay 1 grupo (no cruza), devolvemos precio directo por duración como antes
    if (groups.length === 1) {
      const direct =
        duracion_min === 60 ? rule60At(startMin) : duracion_min === 90 ? rule90At(startMin) : rule120At(startMin);

      if (!direct) {
        return NextResponse.json({ error: "No hay regla directa para esa duración que cubra el inicio" }, { status: 409 });
      }

      return NextResponse.json({
        ok: true,
        id_club,
        id_cancha,
        id_tarifario,
        id_regla: direct.id_regla,
        user_id: userId,
        segmento,
        fecha,
        inicio,
        fin,
        duracion_min,
        precio_total: Number(direct.precio),
        prorrateado: false,
        regla: direct,
      });
    }

    // Caso híbrido: suma por grupos, manteniendo “paquetes” dentro de cada grupo
    let total = 0;

    const breakdown: Array<{
      desde: string;
      hasta: string;
      minutos: number;
      dayOffset: 0 | 1;
      id_regla_60: number;
      precio_60: number;
      precio_90?: number | null;
      precio_120?: number | null;
      subtotal: number;
    }> = [];

    for (const g of groups) {
      const minutes = g.endAbs - g.startAbs;
      const steps = Math.round(minutes / STEP_MIN); // debería ser entero

      // precios de paquetes para ESTE grupo (por su inicio)
      const r60 = g.rule60;
      const r90 = rule90At(g.startAbs);
      const r120 = rule120At(g.startAbs);

      const price60 = Number(r60.precio);
      const price90 = r90 ? Number(r90.precio) : null;
      const price120 = r120 ? Number(r120.precio) : null;

      const dp = minCostForGroup({ steps, price60, price90, price120 });
      if (!dp.ok) {
        return NextResponse.json(
          {
            error: "No se pudo componer el precio del grupo con paquetes 30/60/90/120",
            grupo: { startAbs: g.startAbs, endAbs: g.endAbs, minutes, steps },
          },
          { status: 409 }
        );
      }

      total += dp.cost;

      const dayOffset = g.startAbs >= 1440 ? 1 : 0;
      const sDay = dayOffset ? g.startAbs - 1440 : g.startAbs;
      const eDay = dayOffset ? g.endAbs - 1440 : g.endAbs;

      breakdown.push({
        desde: `${fmtHHMM(sDay)}${dayOffset ? " (+1)" : ""}`,
        hasta: `${fmtHHMM(eDay)}${dayOffset ? " (+1)" : ""}`,
        minutos: minutes,
        dayOffset: dayOffset as 0 | 1,
        id_regla_60: r60.id_regla,
        precio_60: price60,
        precio_90: price90,
        precio_120: price120,
        subtotal: dp.cost,
      });
    }

    const precio_total = Math.round(total);

    return NextResponse.json({
      ok: true,
      id_club,
      id_cancha,
      id_tarifario,
      id_regla: groups[0]?.rule60?.id_regla ?? null,
      user_id: userId,
      segmento,
      fecha,
      inicio,
      fin,
      duracion_min,
      precio_total,
      prorrateado: true,
      modo: "hibrido",
      breakdown,
    });
  } catch (err: any) {
    console.error("[calcular-precio] ex:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
