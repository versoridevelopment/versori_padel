import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type TipoTurno =
  | "normal"
  | "profesor"
  | "torneo"
  | "escuela"
  | "cumpleanos"
  | "abonado";

type Segmento = "publico" | "profe";

type Body = {
  id_club: number;
  id_cancha: number;

  // desde UI
  inicio: string; // "HH:MM"
  duracion_min: 60 | 90 | 120;
  tipo_turno?: TipoTurno;
  notas?: string | null;

  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  cliente_email?: string | null;

  // turno fijo
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD | null
  weeks_ahead?: number; // default 8
  on_conflict?: "skip" | "abort"; // default skip

  // opcional (admin)
  segmento_override?: Segmento;
};

type Conflict = {
  fecha: string;
  inicio: string;
  fin: string;
  reason:
    | "TURNOS_SOLAPADOS"
    | "ERROR_PRECIO"
    | "PRECIO_INVALIDO"
    | "ERROR_INSERT"
    | "ERROR_CLUB";
  detail?: any;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toMin(hhmm: string) {
  const [h, m] = (hhmm || "").slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function minToHHMM(minAbs: number) {
  const m = ((minAbs % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}
function addDaysISO(dateISO: string, add: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + add);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function weekday0SunAR(fechaISO: string) {
  const d = new Date(`${fechaISO}T00:00:00-03:00`);
  return d.getDay(); // 0..6
}
function clampWeeks(n: number) {
  if (!Number.isFinite(n)) return 8;
  return Math.min(52, Math.max(1, Math.floor(n)));
}

async function assertAdminOrStaff(params: { id_club: number; userId: string }) {
  const { id_club, userId } = params;

  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("id_usuario, id_club, roles!inner(nombre)")
    .eq("id_club", id_club)
    .eq("id_usuario", userId)
    .in("roles.nombre", ["admin", "staff"])
    .limit(1);

  if (error) {
    return {
      ok: false as const,
      status: 500,
      error: `Error validando rol: ${error.message}`,
    };
  }
  if (!data || data.length === 0) {
    return {
      ok: false as const,
      status: 403,
      error: "No tenés permisos admin/staff en este club",
    };
  }
  return { ok: true as const };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const id_club = Number(body?.id_club);
    const id_cancha = Number(body?.id_cancha);

    const inicio = String(body?.inicio || "");
    const duracion_min = Number(body?.duracion_min || 0);

    const tipo_turno = String(body?.tipo_turno || "normal") as TipoTurno;
    const notas = body?.notas ?? null;

    const cliente_nombre = String(body?.cliente_nombre ?? "");
    const cliente_telefono = String(body?.cliente_telefono ?? "");
    const cliente_email = String(body?.cliente_email ?? "");

    const start_date = String(body?.start_date || "");
    const end_date = body?.end_date ? String(body.end_date) : null;

    const weeks_ahead = clampWeeks(Number(body?.weeks_ahead ?? 8));
    const on_conflict = (body?.on_conflict || "skip") as "skip" | "abort";

    const segmento_override: Segmento =
      body?.segmento_override ||
      (tipo_turno === "profesor" ? "profe" : "publico");

    if (!id_club || Number.isNaN(id_club))
      return NextResponse.json({ error: "id_club requerido" }, { status: 400 });

    if (!id_cancha || Number.isNaN(id_cancha))
      return NextResponse.json({ error: "id_cancha requerido" }, { status: 400 });

    if (!/^\d{2}:\d{2}$/.test(inicio))
      return NextResponse.json({ error: "inicio inválido (HH:MM)" }, { status: 400 });

    if (![60, 90, 120].includes(duracion_min))
      return NextResponse.json(
        { error: "duracion_min inválida (60/90/120)" },
        { status: 400 }
      );

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date))
      return NextResponse.json(
        { error: "start_date inválida (YYYY-MM-DD)" },
        { status: 400 }
      );

    if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date))
      return NextResponse.json(
        { error: "end_date inválida (YYYY-MM-DD)" },
        { status: 400 }
      );

    if (cliente_nombre.trim() === "" && cliente_telefono.trim() === "") {
      return NextResponse.json(
        { error: "Cliente requerido (nombre o teléfono)" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr)
      return NextResponse.json(
        { error: "No se pudo validar sesión" },
        { status: 401 }
      );
    const adminUserId = authRes?.user?.id ?? null;
    if (!adminUserId)
      return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });

    const perm = await assertAdminOrStaff({ id_club, userId: adminUserId });
    if (!perm.ok)
      return NextResponse.json({ error: perm.error }, { status: perm.status });

    // --- CORRECCIÓN LÓGICA DE OFFSET (igual que en admin/reservas) ---
    const startMin = toMin(inicio);
    const endMinAbs = startMin + duracion_min;
    
    // Si endMinAbs >= 1440 significa que termina a las 00:00 del día siguiente o después.
    const fin_dia_offset: 0 | 1 = endMinAbs >= 1440 ? 1 : 0;
    const fin = minToHHMM(endMinAbs);
    // ----------------------------------------------------------------

    const dow = weekday0SunAR(start_date);

    // 1) Crear template
    const { data: tf, error: tfErr } = await supabaseAdmin
      .from("turnos_fijos")
      .insert({
        id_club,
        id_cancha,
        dow,
        inicio,
        duracion_min,
        fin,
        fin_dia_offset,
        activo: true,
        segmento: segmento_override,
        tipo_turno,
        notas: notas?.toString() || null,
        cliente_nombre: cliente_nombre.trim() || null,
        cliente_telefono: cliente_telefono.trim() || null,
        cliente_email: cliente_email.trim() || null,
        start_date,
        end_date,
        creado_por: adminUserId,
      })
      .select("id_turno_fijo")
      .single();

    if (tfErr || !tf) {
      return NextResponse.json(
        {
          error: `Error creando turno fijo: ${tfErr?.message || "unknown"}`,
          detail: tfErr,
        },
        { status: 500 }
      );
    }

    const id_turno_fijo = Number((tf as any).id_turno_fijo);

    // 2) Rango de generación
    const maxEnd = addDaysISO(start_date, weeks_ahead * 7);
    const limitEnd = end_date ? (end_date < maxEnd ? end_date : maxEnd) : maxEnd;

    const fechas: string[] = [];
    for (let i = 0; i <= weeks_ahead; i++) {
      const f = addDaysISO(start_date, i * 7);
      if (f > limitEnd) break;
      fechas.push(f);
    }

    // 3) Generar instancias
    const conflicts: Conflict[] = [];
    let created_count = 0;

    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, anticipo_porcentaje")
      .eq("id_club", id_club)
      .maybeSingle();

    if (cErr || !club) {
      return NextResponse.json(
        { error: "Error leyendo club para anticipo", detail: cErr },
        { status: 500 }
      );
    }

    const pctRaw = Number((club as any).anticipo_porcentaje ?? 50);
    const pct = Math.min(100, Math.max(0, pctRaw));

    async function calcularPrecio(params: { fecha: string; inicio: string; fin: string }) {
      const calcRes = await fetch(new URL("/api/reservas/calcular-precio", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          id_club,
          id_cancha,
          fecha: params.fecha,
          inicio: params.inicio,
          fin: params.fin,
          segmento_override,
        }),
        cache: "no-store",
      });

      const calcJson = await calcRes.json().catch(() => null);
      return { calcRes, calcJson };
    }

    for (const fecha of fechas) {
      let precio_total = 0;
      let id_tarifario: number | null = null;
      let id_regla: number | null = null;
      let segmento: Segmento = segmento_override;

      try {
        const { calcRes, calcJson } = await calcularPrecio({ fecha, inicio, fin });

        if (!calcRes.ok || !calcJson?.ok) {
          conflicts.push({
            fecha,
            inicio,
            fin,
            reason: "ERROR_PRECIO",
            detail: calcJson,
          });
          if (on_conflict === "abort") break;
          continue;
        }

        precio_total = Number(calcJson.precio_total || 0);
        if (!Number.isFinite(precio_total) || precio_total <= 0) {
          conflicts.push({
            fecha,
            inicio,
            fin,
            reason: "PRECIO_INVALIDO",
            detail: calcJson,
          });
          if (on_conflict === "abort") break;
          continue;
        }

        id_tarifario = Number(calcJson.id_tarifario);
        id_regla = Number(calcJson.id_regla);
        segmento = (calcJson.segmento ?? segmento_override) as Segmento;
      } catch (e: any) {
        conflicts.push({
          fecha,
          inicio,
          fin,
          reason: "ERROR_PRECIO",
          detail: e?.message || e,
        });
        if (on_conflict === "abort") break;
        continue;
      }

      const monto_anticipo = Math.round((precio_total * (pct / 100)) * 100) / 100;

      const { error: insErr } = await supabaseAdmin.from("reservas").insert({
        id_club,
        id_cancha,
        id_usuario: null,
        fecha,
        inicio,
        fin,
        fin_dia_offset,
        estado: "confirmada",
        precio_total,
        anticipo_porcentaje: pct,
        monto_anticipo,
        segmento,
        id_tarifario: Number.isFinite(id_tarifario) ? id_tarifario : null,
        id_regla: Number.isFinite(id_regla) ? id_regla : null,
        tipo_turno,
        notas: notas?.toString() || null,
        cliente_nombre: cliente_nombre.trim() || null,
        cliente_telefono: cliente_telefono.trim() || null,
        cliente_email: cliente_email.trim() || null,
        origen: "turno_fijo",
        creado_por: adminUserId,
        expires_at: null,
        id_turno_fijo,
      });

      if (insErr) {
        if ((insErr as any).code === "23P01") {
          conflicts.push({ fecha, inicio, fin, reason: "TURNOS_SOLAPADOS" });
          if (on_conflict === "abort") break;
          continue;
        }
        conflicts.push({ fecha, inicio, fin, reason: "ERROR_INSERT", detail: insErr });
        if (on_conflict === "abort") break;
        continue;
      }
      created_count++;
    }

    return NextResponse.json({
      ok: true,
      id_turno_fijo,
      created_count,
      conflicts,
    });
  } catch (e: any) {
    console.error("[POST /api/admin/turnos-fijos] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}

function dowFromISO(fechaISO: string) {
  const d = new Date(`${fechaISO}T00:00:00-03:00`);
  return d.getDay(); 
}

function todayISO() {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id_club = Number(url.searchParams.get("id_club") || 0);
    const fecha = url.searchParams.get("fecha"); 
    const include_future_count =
      url.searchParams.get("include_future_count") === "1" ||
      url.searchParams.get("include_future_count") === "true";

    if (!id_club) return NextResponse.json({ ok: false, error: "id_club requerido" }, { status: 400 });

    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr) return NextResponse.json({ ok: false, error: "No se pudo validar sesión" }, { status: 401 });
    const userId = authRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ ok: false, error: "LOGIN_REQUERIDO" }, { status: 401 });

    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok) return NextResponse.json({ ok: false, error: perm.error }, { status: perm.status });

    let q = supabaseAdmin
      .from("turnos_fijos")
      .select(
        "id_turno_fijo,id_club,id_cancha,dow,inicio,duracion_min,fin,fin_dia_offset,activo,segmento,tipo_turno,notas,cliente_nombre,cliente_telefono,cliente_email,start_date,end_date,created_at,updated_at"
      )
      .eq("id_club", id_club)
      .order("activo", { ascending: false })
      .order("inicio", { ascending: true });

    if (fecha) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return NextResponse.json({ ok: false, error: "fecha inválida (YYYY-MM-DD)" }, { status: 400 });
      }
      const dow = dowFromISO(fecha);
      q = q
        .eq("dow", dow)
        .lte("start_date", fecha)
        .or(`end_date.is.null,end_date.gte.${fecha}`);
    }

    const { data: templates, error: tErr } = await q;
    if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });

    if (!include_future_count) {
      return NextResponse.json({
        ok: true,
        fecha: fecha ?? null,
        dow: fecha ? dowFromISO(fecha) : null,
        data: templates || [],
      });
    }

    const hoy = todayISO();
    const rows = await Promise.all(
      (templates || []).map(async (tf: any) => {
        const { count, error } = await supabaseAdmin
          .from("reservas")
          .select("id_reserva", { count: "exact", head: true })
          .eq("id_club", id_club)
          .eq("id_turno_fijo", tf.id_turno_fijo)
          .gte("fecha", hoy)
          .in("estado", ["confirmada", "pendiente_pago"]);

        return { ...tf, future_count: error ? 0 : Number(count || 0) };
      })
    );

    return NextResponse.json({
      ok: true,
      fecha: fecha ?? null,
      dow: fecha ? dowFromISO(fecha) : null,
      data: rows,
    });
  } catch (e: any) {
    console.error("[GET /api/admin/turnos-fijos] ex:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}