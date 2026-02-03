import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DURACIONES_VALIDAS = [30, 60, 90, 120, 150, 180, 210, 240] as const;
type DuracionMin = (typeof DURACIONES_VALIDAS)[number];
function isDuracionValida(n: number): n is DuracionMin {
  return (DURACIONES_VALIDAS as readonly number[]).includes(n);
}

async function assertAdminOrStaff(params: { id_club: number; userId: string }) {
  const { id_club, userId } = params;
  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("id_usuario, id_club, roles!inner(nombre)")
    .eq("id_club", id_club)
    .eq("id_usuario", userId)
    .in("roles.nombre", ["admin", "cajero"])
    .limit(1);

  if (error)
    return {
      ok: false as const,
      status: 500,
      error: `Error validando rol: ${error.message}`,
    };
  if (!data || data.length === 0)
    return {
      ok: false as const,
      status: 403,
      error: "No tenés permisos admin/staff en este club",
    };
  return { ok: true as const };
}

function toMin(hhmm: string) {
  const [h, m] = (hhmm || "").slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function minToHHMM(minAbs: number) {
  const m = ((minAbs % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}
function computeEnd(inicioHHMM: string, duracion_min: number) {
  const startMin = toMin(inicioHHMM);
  const endMinAbs = startMin + duracion_min;
  // ✅ UNIFICADO
  const fin_dia_offset: 0 | 1 = endMinAbs >= 1440 ? 1 : 0;
  const fin = minToHHMM(endMinAbs);
  return { fin, fin_dia_offset };
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function addDaysISO(dateISO: string, add: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + add);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function todayISO() {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type Body = {
  id_club: number;
  weeks_ahead?: number;
  on_conflict?: "skip" | "abort";
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const id_turno_fijo = Number(resolvedParams.id);

    if (!id_turno_fijo)
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Body | null;
    const id_club = Number(body?.id_club || 0);
    const weeks_ahead = Math.min(52, Math.max(1, Number(body?.weeks_ahead ?? 8)));
    const on_conflict = body?.on_conflict ?? "skip";

    if (!id_club)
      return NextResponse.json({ error: "id_club requerido" }, { status: 400 });

    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr)
      return NextResponse.json({ error: "No se pudo validar sesión" }, { status: 401 });

    const userId = authRes?.user?.id ?? null;
    if (!userId)
      return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });

    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok)
      return NextResponse.json({ error: perm.error }, { status: perm.status });

    const { data: tf, error: tfErr } = await supabaseAdmin
      .from("turnos_fijos")
      .select("*")
      .eq("id_turno_fijo", id_turno_fijo)
      .eq("id_club", id_club)
      .maybeSingle();

    if (tfErr)
      return NextResponse.json({ error: tfErr.message }, { status: 500 });
    if (!tf)
      return NextResponse.json({ error: "Turno fijo no encontrado" }, { status: 404 });

    const id_cancha = Number(tf.id_cancha);
    const inicio = String(tf.inicio).slice(0, 5);
    const duracion_min = Number(tf.duracion_min);

    if (!isDuracionValida(duracion_min)) {
      return NextResponse.json(
        { error: `duracion_min inválida en turno_fijo: ${duracion_min}` },
        { status: 400 },
      );
    }

    const tipo_turno = String(tf.tipo_turno || "normal");
    const notas = tf.notas ?? null;
    const cliente_nombre = (tf.cliente_nombre ?? "").toString();
    const cliente_telefono = (tf.cliente_telefono ?? "").toString();
    const cliente_email = (tf.cliente_email ?? "").toString();

    const { fin, fin_dia_offset } = computeEnd(inicio, duracion_min);

    // Tu criterio actual:
    const segmento_override = tipo_turno === "profesor" ? "profe" : "publico";

    // ✅ Anticipo: leer una sola vez
    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("anticipo_porcentaje")
      .eq("id_club", id_club)
      .maybeSingle();
    if (cErr)
      return NextResponse.json({ error: cErr.message }, { status: 500 });

    const pct = Math.min(100, Math.max(0, Number((club as any)?.anticipo_porcentaje ?? 50)));

    const { data: lastInst } = await supabaseAdmin
      .from("reservas")
      .select("fecha")
      .eq("id_club", id_club)
      .eq("id_turno_fijo", id_turno_fijo)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle();

    const hoy = todayISO();
    const start_from = lastInst?.fecha
      ? addDaysISO(String(lastInst.fecha), 7)
      : String(tf.start_date || hoy);
    const hardEnd = tf.end_date ? String(tf.end_date) : null;

    const dates: string[] = [];
    for (let i = 0; i < weeks_ahead; i++) {
      const d = addDaysISO(start_from, i * 7);
      if (hardEnd && d > hardEnd) break;
      dates.push(d);
    }

    const conflicts: any[] = [];
    let created_count = 0;

    for (const fecha of dates) {
      // precio
      const calcRes = await fetch(new URL("/api/reservas/calcular-precio", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          id_club,
          id_cancha,
          fecha,
          inicio,
          fin,
          segmento_override,
        }),
        cache: "no-store",
      });

      const calcJson = await calcRes.json().catch(() => null);
      if (!calcRes.ok || !calcJson?.ok) {
        conflicts.push({ fecha, inicio, fin, code: "PRECIO", detail: calcJson });
        if (on_conflict === "abort") break;
        continue;
      }

      const precio_total = Number(calcJson?.precio_total || 0);
      if (!Number.isFinite(precio_total) || precio_total <= 0) {
        conflicts.push({ fecha, inicio, fin, code: "PRECIO_INVALIDO", detail: calcJson });
        if (on_conflict === "abort") break;
        continue;
      }

      const id_tarifario = Number(calcJson?.id_tarifario ?? null);
      const id_regla = Number(calcJson?.id_regla ?? null);
      const segmento = (calcJson?.segmento ?? segmento_override) as any;

      const monto_anticipo = round2(precio_total * (pct / 100));

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
        creado_por: userId,
        expires_at: null,
        id_turno_fijo,
      });

      if (insErr) {
        if ((insErr as any).code === "23P01") {
          conflicts.push({ fecha, inicio, fin, code: "TURNOS_SOLAPADOS" });
          if (on_conflict === "abort") break;
          continue;
        }
        conflicts.push({ fecha, inicio, fin, code: "ERROR_INSERT", detail: insErr });
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
      start_from,
      weeks_ahead,
    });
  } catch (e: any) {
    console.error("[POST /api/admin/turnos-fijos/:id/regenerar] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
