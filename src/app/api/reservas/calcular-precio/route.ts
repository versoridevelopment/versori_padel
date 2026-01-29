import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Segmento = "publico" | "profe";

type Body = {
  id_club: number;
  id_cancha: number;
  fecha: string; // YYYY-MM-DD (fecha REAL del request)
  inicio: string; // HH:MM
  fin: string; // HH:MM
  segmento_override?: Segmento; // ✅ (para admin)
};

type Regla = {
  id_regla: number;
  id_tarifario: number;
  segmento: Segmento;
  dow: number | null; // 0=Dom..6=Sáb
  vigente_desde: string;
  vigente_hasta: string | null;
  hora_desde: string; // HH:MM:SS
  hora_hasta: string; // HH:MM:SS
  cruza_medianoche: boolean;
  duracion_min: number; // 60/90/120
  precio: number;
  prioridad: number;
  activo: boolean;
};

function toMin(hhmm: string) {
  const [h, m] = (hhmm || "").slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

function timeToMinFromDB(hms: string) {
  return toMin((hms || "").slice(0, 5));
}

// ✅ AR timezone safe
function weekday0Sun(fechaISO: string) {
  const d = new Date(`${fechaISO}T00:00:00-03:00`);
  return d.getDay(); // 0..6
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
  // cruza: [from..1440) U [0..to)
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
    if (Number(b.prioridad) !== Number(a.prioridad))
      return Number(b.prioridad) - Number(a.prioridad);
    // tie-break: dow específico > dow null
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
    return {
      id_tarifario: Number(cancha.id_tarifario),
      id_tipo_cancha: Number(cancha.id_tipo_cancha),
    };
  }

  const { data: def, error: dErr } = await supabaseAdmin
    .from("club_tarifarios_default")
    .select("id_tarifario")
    .eq("id_club", id_club)
    .eq("id_tipo_cancha", cancha.id_tipo_cancha)
    .maybeSingle();

  if (dErr) throw dErr;

  if (def?.id_tarifario) {
    return {
      id_tarifario: Number(def.id_tarifario),
      id_tipo_cancha: Number(cancha.id_tipo_cancha),
    };
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
 * DP costo mínimo para un tramo homogéneo de N steps (30’)
 */
function minCostForGroup(params: {
  steps: number;
  price60: number;
  price90?: number | null;
  price120?: number | null;
}) {
  const { steps, price60, price90, price120 } = params;

  const INF = 1e18;
  const dp = new Array<number>(steps + 1).fill(INF);
  dp[0] = 0;

  const pieceCosts: Array<{ take: number; cost: number }> = [
    { take: 1, cost: price60 / 2 }, // 30
    { take: 2, cost: price60 }, // 60
  ];
  if (price90 != null) pieceCosts.push({ take: 3, cost: price90 });
  if (price120 != null) pieceCosts.push({ take: 4, cost: price120 });

  for (let i = 0; i <= steps; i++) {
    if (dp[i] >= INF) continue;
    for (const p of pieceCosts) {
      const j = i + p.take;
      if (j > steps) continue;
      const v = dp[i] + p.cost;
      if (v < dp[j]) dp[j] = v;
    }
  }

  if (dp[steps] >= INF) return { ok: false as const, cost: 0 };
  return { ok: true as const, cost: dp[steps] };
}

/**
 * ✅ Detecta “día lógico anterior” para la madrugada.
 * Si existe una regla del día anterior que cruza medianoche y cubre startMin,
 * entonces para esos minutos (hasta su hora_hasta) se debe usar el día anterior.
 */
function findPrevCarryWindow(params: {
  startMin: number; // 0..1439
  reglas60_prev: Regla[];
  dowPrev: number;
}) {
  const { startMin, reglas60_prev, dowPrev } = params;

  const candidates = reglas60_prev.filter((r) => {
    // tiene que ser del dow previo (o null) y cruzar
    if (r.dow !== null && Number(r.dow) !== dowPrev) return false;

    const from = timeToMinFromDB(r.hora_desde);
    const to = timeToMinFromDB(r.hora_hasta);
    const crosses = !!r.cruza_medianoche || to <= from;
    if (!crosses) return false;

    return startInWindow({
      startMin,
      fromMin: from,
      toMin: to,
      cruza_medianoche: true,
    });
  });

  if (candidates.length === 0) return null;

  // elegimos la mejor por prioridad
  candidates.sort((a, b) => Number(b.prioridad) - Number(a.prioridad));
  const best = candidates[0];

  const cutoffEnd = timeToMinFromDB(best.hora_hasta); // ej 03:00 => 180
  return {
    rule60: best,
    cutoffEnd, // 0..1439 (fin del tramo madrugada del día anterior)
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const id_club = Number(body?.id_club);
    const id_cancha = Number(body?.id_cancha);
    const fecha = String(body?.fecha || "");
    const inicio = String(body?.inicio || "");
    const fin = String(body?.fin || "");

    if (!id_club || Number.isNaN(id_club))
      return NextResponse.json({ error: "id_club es requerido y numérico" }, { status: 400 });
    if (!id_cancha || Number.isNaN(id_cancha))
      return NextResponse.json({ error: "id_cancha es requerido y numérico" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      return NextResponse.json({ error: "fecha debe ser YYYY-MM-DD" }, { status: 400 });
    if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fin))
      return NextResponse.json({ error: "inicio/fin deben ser HH:MM" }, { status: 400 });

    const startMin = toMin(inicio);
    let endMin = toMin(fin);
    if (endMin <= startMin) endMin += 1440;

    const duracion_min = endMin - startMin;
    if (![60, 90, 120].includes(duracion_min)) {
      return NextResponse.json({ error: "Duración no soportada (60/90/120)", duracion_min }, { status: 400 });
    }

    // ✅ auth + segmento (con override)
    const sb = await getSupabaseServerClient();
    const { data: auth } = await sb.auth.getUser();
    const userId = auth?.user?.id ?? null;

    const segOverride = body?.segmento_override;
    const segmento: Segmento =
      segOverride === "publico" || segOverride === "profe"
        ? segOverride
        : await resolveSegmentoForUser({ userId, id_club });

    // tarifario
    const resolved = await resolveTarifarioId(id_club, id_cancha);
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: 409 });
    const id_tarifario = resolved.id_tarifario;

    // ====== FECHAS/DOW ======
    const fecha0 = fecha;
    const dow0 = weekday0Sun(fecha0);

    const fechaPrev = addDaysISO(fecha0, -1);
    const dowPrev = (dow0 + 6) % 7;

    const needsNextDay = endMin > 1440;
    const fecha1 = needsNextDay ? addDaysISO(fecha0, 1) : null;
    const dow1 = needsNextDay ? (dow0 + 1) % 7 : null;

    // ====== REGLAS: prev / day0 / day1 ======
    // prev
    const reglas60_prev = await fetchReglas({ id_tarifario, segmento, duracion_min: 60, fechaISO: fechaPrev });
    const reglas90_prev = await fetchReglas({ id_tarifario, segmento, duracion_min: 90, fechaISO: fechaPrev });
    const reglas120_prev = await fetchReglas({ id_tarifario, segmento, duracion_min: 120, fechaISO: fechaPrev });

    // day0
    const reglas60_0 = await fetchReglas({ id_tarifario, segmento, duracion_min: 60, fechaISO: fecha0 });
    const reglas90_0 = await fetchReglas({ id_tarifario, segmento, duracion_min: 90, fechaISO: fecha0 });
    const reglas120_0 = await fetchReglas({ id_tarifario, segmento, duracion_min: 120, fechaISO: fecha0 });

    // day1 (solo si cruza)
    const reglas60_1 =
      needsNextDay && fecha1 ? await fetchReglas({ id_tarifario, segmento, duracion_min: 60, fechaISO: fecha1 }) : [];
    const reglas90_1 =
      needsNextDay && fecha1 ? await fetchReglas({ id_tarifario, segmento, duracion_min: 90, fechaISO: fecha1 }) : [];
    const reglas120_1 =
      needsNextDay && fecha1 ? await fetchReglas({ id_tarifario, segmento, duracion_min: 120, fechaISO: fecha1 }) : [];

    // ✅ Detectar si este turno (en esta fecha) debería pertenecer al “día anterior” en madrugada
    const prevCarry = findPrevCarryWindow({
      startMin: startMin % 1440,
      reglas60_prev,
      dowPrev,
    });
    // prevCarry.cutoffEnd = ej 180 (03:00)

    const STEP_MIN = 30;

    

    // ====== selector de reglas por tiempo absoluto ======
    function getRuleAt(
      tAbs: number,
      reglasPrev: Regla[],
      reglas0: Regla[],
      reglas1: Regla[]
    ) {
      // día relativo dentro del turno
      const dayIndex = tAbs >= 1440 ? 1 : 0;
      const minInDay = ((tAbs % 1440) + 1440) % 1440;

      // Caso A) Estamos en day0 (tAbs<1440) y el turno cae en “madrugada del día anterior”
      // => usar prev hasta cutoffEnd, luego day0.
      if (dayIndex === 0 && prevCarry) {
        if (minInDay < prevCarry.cutoffEnd) {
          return pickBestRuleForStart({ reglas: reglasPrev, startMinInDay: minInDay, dow: dowPrev });
        }
        return pickBestRuleForStart({ reglas: reglas0, startMinInDay: minInDay, dow: dow0 });
      }

      // Caso B) Estamos en day1 (tAbs>=1440): podría seguir perteneciendo al day0 si day0 tiene regla que cruza
      // (esto cubre el caso clásico 23:00–01:00 del día0)
      if (dayIndex === 1) {
        if (dow1 === null) return null;

        // Si el día0 tiene una regla cruzando que cubre este min, seguimos en day0
        const carryFrom0 = (() => {
          const r60_0 = pickBestRuleForStart({ reglas: reglas60_0, startMinInDay: minInDay, dow: dow0 });
          if (!r60_0) return null;
          const from = timeToMinFromDB(r60_0.hora_desde);
          const to = timeToMinFromDB(r60_0.hora_hasta);
          const crosses = !!r60_0.cruza_medianoche || to <= from;
          if (!crosses) return null;
          // si es madrugada (minInDay < to) entonces pertenece al día0
          return minInDay < to ? true : null;
        })();

        if (carryFrom0) {
          return pickBestRuleForStart({ reglas: reglas0, startMinInDay: minInDay, dow: dow0 });
        }

        // si no, es day1 real
        return pickBestRuleForStart({ reglas: reglas1, startMinInDay: minInDay, dow: dow1 });
      }

      // Default: day0 normal
      return pickBestRuleForStart({ reglas: reglas0, startMinInDay: minInDay, dow: dow0 });
    }

    const rule60At = (tAbs: number) => getRuleAt(tAbs, reglas60_prev, reglas60_0, reglas60_1);
    const rule90At = (tAbs: number) => getRuleAt(tAbs, reglas90_prev, reglas90_0, reglas90_1);
    const rule120At = (tAbs: number) => getRuleAt(tAbs, reglas120_prev, reglas120_0, reglas120_1);

    // ✅ key 60|90|120 (para cortes tipo 14:00 aunque solo cambie 90/120)
    const tariffKeyAt = (tAbs: number) => {
      const r60 = rule60At(tAbs);
      if (!r60) return null;
      const r90 = rule90At(tAbs);
      const r120 = rule120At(tAbs);
      return {
        r60,
        r90,
        r120,
        key: `${r60.id_regla}|${r90?.id_regla ?? 0}|${r120?.id_regla ?? 0}`,
      };
    };

    // ====== grupos homogéneos por key ======
    type Group = {
      startAbs: number;
      endAbs: number;
      r60: Regla;
      r90: Regla | null;
      r120: Regla | null;
      key: string;
    };

    const groups: Group[] = [];
    let t = startMin;

    const first = tariffKeyAt(t);
    if (!first) {
      return NextResponse.json({ error: "Faltan reglas para cubrir el inicio" }, { status: 409 });
    }

    let curStart = t;
    let curKey = first.key;
    let curR60 = first.r60;
    let curR90 = first.r90 ?? null;
    let curR120 = first.r120 ?? null;

    for (; t < endMin; t += STEP_MIN) {
      const cur = tariffKeyAt(t);
      if (!cur) {
        return NextResponse.json({ error: "Faltan reglas para cubrir un tramo del turno", tramo_abs: t }, { status: 409 });
      }

      if (cur.key !== curKey) {
        groups.push({ startAbs: curStart, endAbs: t, r60: curR60, r90: curR90, r120: curR120, key: curKey });
        curStart = t;
        curKey = cur.key;
        curR60 = cur.r60;
        curR90 = cur.r90 ?? null;
        curR120 = cur.r120 ?? null;
      }
    }
    groups.push({ startAbs: curStart, endAbs: endMin, r60: curR60, r90: curR90, r120: curR120, key: curKey });

    // ====== si es 1 grupo: directo ======
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

    // ====== híbrido: suma por grupos ======
    let total = 0;

    const breakdown: Array<{
      desde: string;
      hasta: string;
      minutos: number;
      dayOffset: 0 | 1;
      id_regla_60: number;
      id_regla_90: number | null;
      id_regla_120: number | null;
      precio_60: number;
      precio_90?: number | null;
      precio_120?: number | null;
      subtotal: number;
    }> = [];

    for (const g of groups) {
      const minutes = g.endAbs - g.startAbs;
      const steps = Math.round(minutes / STEP_MIN);

      const price60 = Number(g.r60.precio);
      const price90 = g.r90 ? Number(g.r90.precio) : null;
      const price120 = g.r120 ? Number(g.r120.precio) : null;

      const dp = minCostForGroup({ steps, price60, price90, price120 });
      if (!dp.ok) {
        return NextResponse.json(
          { error: "No se pudo componer el precio del grupo con paquetes 30/60/90/120", grupo: g },
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
        id_regla_60: g.r60.id_regla,
        id_regla_90: g.r90?.id_regla ?? null,
        id_regla_120: g.r120?.id_regla ?? null,
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
      id_regla: groups[0]?.r60?.id_regla ?? null,
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
      debug: {
        prevCarry: prevCarry
          ? { fechaPrev, dowPrev, cutoffEnd: prevCarry.cutoffEnd, id_regla_60_prev: prevCarry.rule60.id_regla }
          : null,
        fecha0,
        dow0,
        fecha1,
        dow1,
      },
    });
  } catch (err: any) {
    console.error("[calcular-precio] ex:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
