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
  duracion_min: number;
  precio: number;
  prioridad: number;
  activo: boolean;
};

// ✅ Duraciones soportadas (todas con tarifarios en DB)
const SUPPORTED_DURS = [60, 90, 120, 150, 180, 210, 240] as const;
type Dur = (typeof SUPPORTED_DURS)[number];

// ✅ FIX TS: map tipado de duraciones -> reglas vacías
function emptyReglasMap(): Record<Dur, Regla[]> {
  return SUPPORTED_DURS.reduce((acc, d) => {
    acc[d] = [];
    return acc;
  }, {} as Record<Dur, Regla[]>);
}

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

/**
 * Trae todas las reglas activas de ese día (fechaISO) para TODAS las duraciones soportadas,
 * y las devuelve agrupadas por duracion_min.
 */
async function fetchReglasByDur(params: {
  id_tarifario: number;
  segmento: Segmento;
  fechaISO: string;
}) {
  const { id_tarifario, segmento, fechaISO } = params;

  const { data, error } = await supabaseAdmin
    .from("canchas_tarifas_reglas")
    .select("*")
    .eq("id_tarifario", id_tarifario)
    .eq("segmento", segmento)
    .in("duracion_min", [...SUPPORTED_DURS])
    .eq("activo", true)
    .lte("vigente_desde", fechaISO)
    .or(`vigente_hasta.is.null,vigente_hasta.gte.${fechaISO}`)
    .order("prioridad", { ascending: false });

  if (error) throw error;

  // ✅ FIX TS: usar helper tipado
  const out = emptyReglasMap();

  for (const r of (data || []) as Regla[]) {
    const d = Number(r.duracion_min) as Dur;
    if (SUPPORTED_DURS.includes(d)) out[d].push(r);
  }

  return out;
}

function fmtHHMM(minInDay: number) {
  const hh = String(Math.floor(minInDay / 60)).padStart(2, "0");
  const mm = String(minInDay % 60).padStart(2, "0");
  return `${hh}:${mm}`;
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

  candidates.sort((a, b) => Number(b.prioridad) - Number(a.prioridad));
  const best = candidates[0];

  const cutoffEnd = timeToMinFromDB(best.hora_hasta); // ej 03:00 => 180
  return {
    rule60: best,
    cutoffEnd, // 0..1439
  };
}

/**
 * DP exacto para minutos múltiplos de 30 usando “piezas” disponibles:
 * - 30 (derivada de 60/2)
 * - 60/90/120/150/180/210/240 (si existen)
 *
 * OJO: SOLO se usa como fallback cuando el grupo no coincide exacto con una duración.
 */
function dpComposeCost(params: {
  minutes: number;
  pricesByDur: Record<Dur, number>;
}) {
  const { minutes, pricesByDur } = params;

  if (minutes % 30 !== 0)
    return { ok: false as const, cost: 0, composition: [] as number[] };

  const steps = minutes / 30;
  const INF = 1e18;
  const dp = new Array<number>(steps + 1).fill(INF);
  const prev = new Array<{ i: number; dur: number } | null>(steps + 1).fill(
    null
  );
  dp[0] = 0;

  const pieces: Array<{ take: number; cost: number; dur: number }> = [
    { take: 1, cost: pricesByDur[60] / 2, dur: 30 }, // 30 derivado
  ];

  for (const d of SUPPORTED_DURS) {
    const take = d / 30;
    if (Number.isInteger(take)) {
      pieces.push({ take, cost: pricesByDur[d], dur: d });
    }
  }

  // DP
  for (let i = 0; i <= steps; i++) {
    if (dp[i] >= INF) continue;
    for (const p of pieces) {
      const j = i + p.take;
      if (j > steps) continue;
      const v = dp[i] + p.cost;
      if (v < dp[j]) {
        dp[j] = v;
        prev[j] = { i, dur: p.dur };
      }
    }
  }

  if (dp[steps] >= INF)
    return { ok: false as const, cost: 0, composition: [] as number[] };

  // reconstrucción (duraciones usadas)
  const comp: number[] = [];
  let cur = steps;
  while (cur > 0) {
    const p = prev[cur];
    if (!p) break;
    comp.push(p.dur);
    cur = p.i;
  }
  comp.reverse();

  return { ok: true as const, cost: dp[steps], composition: comp };
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
      return NextResponse.json(
        { error: "id_club es requerido y numérico" },
        { status: 400 }
      );
    if (!id_cancha || Number.isNaN(id_cancha))
      return NextResponse.json(
        { error: "id_cancha es requerido y numérico" },
        { status: 400 }
      );
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      return NextResponse.json(
        { error: "fecha debe ser YYYY-MM-DD" },
        { status: 400 }
      );
    if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fin))
      return NextResponse.json(
        { error: "inicio/fin deben ser HH:MM" },
        { status: 400 }
      );

    const startMin = toMin(inicio);
    let endMin = toMin(fin);
    if (endMin <= startMin) endMin += 1440;

    const duracion_min = endMin - startMin;

    if (!SUPPORTED_DURS.includes(duracion_min as Dur)) {
      return NextResponse.json(
        {
          error: `Duración no soportada (${SUPPORTED_DURS.join("/")})`,
          duracion_min,
        },
        { status: 400 }
      );
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
    if ("error" in resolved)
      return NextResponse.json({ error: resolved.error }, { status: 409 });
    const id_tarifario = resolved.id_tarifario;

    // ====== FECHAS/DOW ======
    const fecha0 = fecha;
    const dow0 = weekday0Sun(fecha0);

    const fechaPrev = addDaysISO(fecha0, -1);
    const dowPrev = (dow0 + 6) % 7;

    const needsNextDay = endMin > 1440;
    const fecha1 = needsNextDay ? addDaysISO(fecha0, 1) : null;
    const dow1 = needsNextDay ? (dow0 + 1) % 7 : null;

    // ====== REGLAS: prev / day0 / day1 (todas las duraciones) ======
    const reglas_prev = await fetchReglasByDur({
      id_tarifario,
      segmento,
      fechaISO: fechaPrev,
    });
    const reglas_0 = await fetchReglasByDur({
      id_tarifario,
      segmento,
      fechaISO: fecha0,
    });

    // ✅ FIX TS: en vez de Object.fromEntries(...), usamos helper tipado
    const reglas_1 =
      needsNextDay && fecha1
        ? await fetchReglasByDur({ id_tarifario, segmento, fechaISO: fecha1 })
        : emptyReglasMap();

    // ✅ Detectar si este turno (en esta fecha) debería pertenecer al “día anterior” en madrugada
    const prevCarry = findPrevCarryWindow({
      startMin: startMin % 1440,
      reglas60_prev: reglas_prev[60],
      dowPrev,
    });

    const STEP_MIN = 30;

    // ====== selector de reglas por tiempo absoluto (por duración) ======
    function getRuleAt(tAbs: number, dur: Dur) {
      const dayIndex = tAbs >= 1440 ? 1 : 0;
      const minInDay = ((tAbs % 1440) + 1440) % 1440;

      // Caso A) day0 y cae en “madrugada del día anterior”
      if (dayIndex === 0 && prevCarry) {
        if (minInDay < prevCarry.cutoffEnd) {
          return pickBestRuleForStart({
            reglas: reglas_prev[dur],
            startMinInDay: minInDay,
            dow: dowPrev,
          });
        }
        return pickBestRuleForStart({
          reglas: reglas_0[dur],
          startMinInDay: minInDay,
          dow: dow0,
        });
      }

      // Caso B) day1 (tAbs>=1440): puede seguir perteneciendo al day0 si day0 tiene regla cruzando
      if (dayIndex === 1) {
        if (dow1 === null) return null;

        // Detectamos carry desde day0 usando 60 como “canónica”
        const carryFrom0 = (() => {
          const r60_0 = pickBestRuleForStart({
            reglas: reglas_0[60],
            startMinInDay: minInDay,
            dow: dow0,
          });
          if (!r60_0) return null;
          const from = timeToMinFromDB(r60_0.hora_desde);
          const to = timeToMinFromDB(r60_0.hora_hasta);
          const crosses = !!r60_0.cruza_medianoche || to <= from;
          if (!crosses) return null;
          return minInDay < to ? true : null; // madrugada => pertenece al día0
        })();

        if (carryFrom0) {
          return pickBestRuleForStart({
            reglas: reglas_0[dur],
            startMinInDay: minInDay,
            dow: dow0,
          });
        }

        // day1 real
        return pickBestRuleForStart({
          reglas: reglas_1[dur],
          startMinInDay: minInDay,
          dow: dow1,
        });
      }

      // Default: day0 normal
      return pickBestRuleForStart({
        reglas: reglas_0[dur],
        startMinInDay: minInDay,
        dow: dow0,
      });
    }

    // ✅ “key” incluye TODAS las duraciones para detectar cambio de tarifario aunque cambie solo 150/180/etc.
    const tariffKeyAt = (tAbs: number) => {
      const rules: Record<Dur, Regla> = {} as any;

      for (const d of SUPPORTED_DURS) {
        const r = getRuleAt(tAbs, d);
        if (!r) return { ok: false as const, missingDur: d };
        rules[d] = r;
      }

      const key = SUPPORTED_DURS.map((d) => rules[d].id_regla).join("|");
      return { ok: true as const, rules, key };
    };

    // ====== grupos homogéneos por key ======
    type Group = {
      startAbs: number;
      endAbs: number;
      rules: Record<Dur, Regla>;
      key: string;
    };

    const groups: Group[] = [];
    let t = startMin;

    const first = tariffKeyAt(t);
    if (!first.ok) {
      return NextResponse.json(
        { error: "Faltan reglas para cubrir el inicio", missing_duracion: first.missingDur },
        { status: 409 }
      );
    }

    let curStart = t;
    let curKey = first.key;
    let curRules = first.rules;

    for (; t < endMin; t += STEP_MIN) {
      const cur = tariffKeyAt(t);
      if (!cur.ok) {
        return NextResponse.json(
          {
            error: "Faltan reglas para cubrir un tramo del turno",
            tramo_abs: t,
            missing_duracion: cur.missingDur,
          },
          { status: 409 }
        );
      }

      if (cur.key !== curKey) {
        groups.push({
          startAbs: curStart,
          endAbs: t,
          rules: curRules,
          key: curKey,
        });
        curStart = t;
        curKey = cur.key;
        curRules = cur.rules;
      }
    }
    groups.push({ startAbs: curStart, endAbs: endMin, rules: curRules, key: curKey });

    // ====== si es 1 grupo: directo (exacto por duracion_min) ======
    if (groups.length === 1) {
      const direct = getRuleAt(startMin, duracion_min as Dur);
      if (!direct) {
        return NextResponse.json(
          { error: "No hay regla directa para esa duración que cubra el inicio", duracion_min },
          { status: 409 }
        );
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
      id_regla_aplicada: number | null;
      duracion_usada: number; // minutos del grupo (o piezas si fallback)
      subtotal: number;
      composition?: number[]; // solo si hizo DP fallback
    }> = [];

    for (const g of groups) {
      const minutes = g.endAbs - g.startAbs;

      // precios por duración en este grupo (constantes por key)
      const pricesByDur = Object.fromEntries(
        SUPPORTED_DURS.map((d) => [d, Number(g.rules[d].precio)])
      ) as Record<Dur, number>;

      let subtotal: number;
      let id_regla_aplicada: number | null = null;
      let duracion_usada = minutes;
      let composition: number[] | undefined;

      // ✅ Caso normal: el largo del grupo coincide con una duración soportada => precio exacto de esa duración
      if (SUPPORTED_DURS.includes(minutes as Dur)) {
        const d = minutes as Dur;
        subtotal = pricesByDur[d];
        id_regla_aplicada = g.rules[d].id_regla;
      } else if (minutes === 30) {
        // ✅ fragmento de 30’ (por cortes): derivamos de 60
        subtotal = pricesByDur[60] / 2;
        id_regla_aplicada = g.rules[60].id_regla;
        duracion_usada = 30;
      } else {
        // Fallback (raro): componer exacto por DP (múltiplos de 30)
        const dp = dpComposeCost({ minutes, pricesByDur });
        if (!dp.ok) {
          return NextResponse.json(
            { error: "No se pudo componer el precio del grupo", minutes, grupo: g },
            { status: 409 }
          );
        }
        subtotal = dp.cost;
        composition = dp.composition;
        // id_regla_aplicada: no hay una sola, dejamos null
        id_regla_aplicada = null;
      }

      total += subtotal;

      const dayOffset = g.startAbs >= 1440 ? 1 : 0;
      const sDay = dayOffset ? g.startAbs - 1440 : g.startAbs;
      const eDay = dayOffset ? g.endAbs - 1440 : g.endAbs;

      breakdown.push({
        desde: `${fmtHHMM(sDay)}${dayOffset ? " (+1)" : ""}`,
        hasta: `${fmtHHMM(eDay)}${dayOffset ? " (+1)" : ""}`,
        minutos: minutes,
        dayOffset: dayOffset as 0 | 1,
        id_regla_aplicada,
        duracion_usada,
        subtotal,
        ...(composition ? { composition } : {}),
      });
    }

    const precio_total = Math.round(total);

    return NextResponse.json({
      ok: true,
      id_club,
      id_cancha,
      id_tarifario,
      id_regla: null, // híbrido: no hay una única regla
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
          ? {
              fechaPrev,
              dowPrev,
              cutoffEnd: prevCarry.cutoffEnd,
              id_regla_60_prev: prevCarry.rule60.id_regla,
            }
          : null,
        fecha0,
        dow0,
        fecha1,
        dow1,
        groups_count: groups.length,
      },
    });
  } catch (err: any) {
    console.error("[calcular-precio] ex:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
