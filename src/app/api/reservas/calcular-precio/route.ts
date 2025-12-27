// src/app/api/reservas/calcular-precio/route.ts
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
  // segmento?: "publico" | "profe"; // <-- ignorado (server decide)
};

type Segmento = "publico" | "profe";

function toMin(hhmm: string) {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return h * 60 + (m || 0);
}

function weekday0Sun(fechaISO: string) {
  // JS: 0=Dom .. 6=Sáb (coincide con tu DOW)
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.getDay();
}

function timeToMinFromDB(hms: string) {
  // "HH:MM:SS" o "HH:MM"
  return toMin((hms || "").slice(0, 5));
}

function overlap(a0: number, a1: number, b0: number, b1: number) {
  // intervalos [a0,a1) y [b0,b1) (a1>a0, b1>b0)
  return a0 < b1 && b0 < a1;
}

/**
 * Resuelve el segmento real del usuario logueado (profe/publico) para un club.
 * - Si no hay usuario logueado => "publico"
 * - Si el usuario tiene rol "profe" en club_usuarios => "profe"
 */
async function resolveSegmentoForUser(params: {
  userId: string | null;
  id_club: number;
}): Promise<Segmento> {
  const { userId, id_club } = params;
  if (!userId) return "publico";

  // Tipado simple para evitar TS issues del join
  type Row = {
    id_usuario: string;
    id_club: number;
    roles: { nombre: string } | { nombre: string }[] | null;
  };

  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    // Importante: el join con roles depende de tu FK.
    // Si tu FK se llama distinto, cambiá "roles" por el nombre real de la relación.
    .select("id_usuario,id_club,roles!inner(nombre)")
    .eq("id_usuario", userId)
    .eq("id_club", id_club)
    .eq("roles.nombre", "profe")
    .limit(1);

  if (error) {
    console.error("[resolveSegmentoForUser] error:", error);
    return "publico";
  }

  const rows = (data || []) as Row[];
  return rows.length > 0 ? "profe" : "publico";
}

async function resolveTarifarioId(id_club: number, id_cancha: number) {
  // 1) Cancha con tarifario asignado directo
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

  // 2) Default por tipo de cancha
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

  // Sin fallback a precio_hora. Esto es configuración obligatoria.
  return { error: "No hay tarifario asignado (cancha ni default por tipo)" as const };
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

    // ✅ cruza medianoche (ej 23:30 -> 01:00)
    // si fin <= inicio, interpretamos fin como "día siguiente"
    if (endMin <= startMin) {
      endMin += 1440;
    }

    const duracion_min = endMin - startMin;

    // Permitidas según tus reglas actuales
    if (![60, 90, 120].includes(duracion_min)) {
      return NextResponse.json(
        { error: "Duración no soportada por tarifario (permitido: 60/90/120 min)", duracion_min },
        { status: 400 }
      );
    }

    // ✅ Usuario logueado (cookie-based)
    const sb = await getSupabaseServerClient();
    const { data: auth } = await sb.auth.getUser();
    const userId = auth?.user?.id ?? null;

    // ✅ Segmento real (server decide)
    const segmento = await resolveSegmentoForUser({ userId, id_club });

    const resolved = await resolveTarifarioId(id_club, id_cancha);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 409 });
    }

    const id_tarifario = resolved.id_tarifario;
    const dow = weekday0Sun(fecha);

    // Reglas candidatas
    const { data: reglas, error: rErr } = await supabaseAdmin
      .from("canchas_tarifas_reglas")
      .select("*")
      .eq("id_tarifario", id_tarifario)
      .eq("segmento", segmento)
      .eq("duracion_min", duracion_min)
      .eq("activo", true)
      .lte("vigente_desde", fecha)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${fecha}`)
      .order("prioridad", { ascending: false });

    if (rErr) {
      console.error("[calcular-precio] reglas error:", rErr);
      return NextResponse.json({ error: "Error al consultar reglas" }, { status: 500 });
    }

    const start = startMin; // puede ser >1440? no, porque viene HH:MM del día
    const end = endMin;     // puede ser >1440 si cruza medianoche

    // Filtrado por DOW y franja horaria, robusto para cruza medianoche
    const matches = (reglas ?? []).filter((r: any) => {
      if (r.dow !== null && Number(r.dow) !== dow) return false;

      const from = timeToMinFromDB(r.hora_desde);
      const toBase = timeToMinFromDB(r.hora_hasta);

      // ⚠️ robustez: si to <= from, lo tratamos como cruce aunque cruza_medianoche esté mal
      const crosses = !!r.cruza_medianoche || toBase <= from;

      if (crosses) {
        const win0 = from;
        const win1 = toBase + 1440;

        // turno puede venir como:
        // - 23:30 -> 01:00 => [1410, 1500]
        // - 00:30 -> 02:00 => [30, 120]
        // Para ventana cruzada, contemplamos también turno +1440 por si fuera necesario
        const a0 = start;
        const a1 = end;
        const b0 = start + 1440;
        const b1 = end + 1440;

        return overlap(a0, a1, win0, win1) || overlap(b0, b1, win0, win1);
      } else {
        const win0 = from;
        const win1 = toBase;

        // si el turno cruza medianoche, end puede ser >1440 y jamás matchearía una ventana normal
        // eso es correcto: una ventana normal no debería cubrir un turno que cruza.
        // (si querés permitirlo, la regla debe ser cruzada)
        return overlap(start, end, win0, win1);
      }
    });

    if (matches.length === 0) {
      return NextResponse.json(
        {
          error: "No hay una regla que cubra ese horario/fecha/duración",
          id_tarifario,
          segmento,
          duracion_min,
          fecha,
          inicio,
          fin,
        },
        { status: 409 }
      );
    }

    // Mejor por prioridad; empate: DOW específico > null
    const best = matches.sort((a: any, b: any) => {
      if (b.prioridad !== a.prioridad) return Number(b.prioridad) - Number(a.prioridad);
      const aSpec = a.dow === null ? 0 : 1;
      const bSpec = b.dow === null ? 0 : 1;
      return bSpec - aSpec;
    })[0];

    return NextResponse.json({
      ok: true,
      id_club,
      id_cancha,
      id_tarifario,
      id_regla: best.id_regla,
      user_id: userId,
      segmento, // ✅ devolvemos el segmento para UI/draft
      fecha,
      inicio,
      fin,
      duracion_min,
      precio_total: Number(best.precio),
      regla: best,
    });
  } catch (err: any) {
    console.error("[calcular-precio] ex:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
