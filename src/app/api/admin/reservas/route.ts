import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  fecha: string; // YYYY-MM-DD
  inicio: string; // HH:MM

  // Aceptamos cualquiera:
  duracion_min?: 60 | 90 | 120;
  fin?: string; // HH:MM (si viene, calculamos duracion)

  tipo_turno?: TipoTurno;
  notas?: string | null;

  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  cliente_email?: string | null;

  // opcional: si querés forzar segmento desde UI admin
  segmento_override?: Segmento;
};

function toMin(hhmm: string) {
  const [h, m] = (hhmm || "").slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
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
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// AR timezone helper (para ventana de solapes)
function arMidnightISO(dateISO: string) {
  return `${dateISO}T00:00:00-03:00`;
}
function addDaysISO(dateISO: string, add: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + add);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
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
    const fecha = String(body?.fecha || "");
    const inicio = String(body?.inicio || "");
    const finFromBody = body?.fin ? String(body.fin) : "";

    const tipo_turno = String(body?.tipo_turno || "normal") as TipoTurno;
    const notas = body?.notas ?? null;

    const cliente_nombre = String(body?.cliente_nombre ?? "");
    const cliente_telefono = String(body?.cliente_telefono ?? "");
    const cliente_email = String(body?.cliente_email ?? "");

    if (!id_club || Number.isNaN(id_club))
      return NextResponse.json({ error: "id_club requerido" }, { status: 400 });
    if (!id_cancha || Number.isNaN(id_cancha))
      return NextResponse.json({ error: "id_cancha requerido" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      return NextResponse.json(
        { error: "fecha inválida (YYYY-MM-DD)" },
        { status: 400 }
      );
    if (!/^\d{2}:\d{2}$/.test(inicio))
      return NextResponse.json(
        { error: "inicio inválido (HH:MM)" },
        { status: 400 }
      );

    // ✅ duracion_min: si no viene, la calculamos desde fin
    let duracion_min = Number(body?.duracion_min || 0);

    if (![60, 90, 120].includes(duracion_min)) {
      if (/^\d{2}:\d{2}$/.test(finFromBody)) {
        const startMin = toMin(inicio);
        let endMin = toMin(finFromBody);
        if (endMin <= startMin) endMin += 1440; // cruza medianoche
        duracion_min = endMin - startMin;
      }
    }

    if (![60, 90, 120].includes(duracion_min)) {
      return NextResponse.json(
        { error: "duracion_min inválida (60/90/120)" },
        { status: 400 }
      );
    }

    // Auth
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

    // Permisos
    const perm = await assertAdminOrStaff({ id_club, userId: adminUserId });
    if (!perm.ok)
      return NextResponse.json({ error: perm.error }, { status: perm.status });

    // Validación mínima cliente
    if (cliente_nombre.trim() === "" && cliente_telefono.trim() === "") {
      return NextResponse.json(
        { error: "Cliente requerido (nombre o teléfono)" },
        { status: 400 }
      );
    }

    // Calcular fin + fin_dia_offset (si vino fin, lo respetamos; si no, lo calculamos)
    const startMin = toMin(inicio);
    const endMinAbs = startMin + duracion_min;
    const fin_dia_offset: 0 | 1 = endMinAbs > 1440 ? 1 : 0;
    const fin = /^\d{2}:\d{2}$/.test(finFromBody)
      ? finFromBody
      : minToHHMM(endMinAbs);

    // Segmento por tipo_turno o override
    const segmento_override: Segmento =
      body?.segmento_override ||
      (tipo_turno === "profesor" ? "profe" : "publico");

    // (Opcional pero útil) Anti-solape rápido en server (además del constraint)
    // Ventana: [fecha 00:00 AR, fecha+2 00:00 AR)
    const windowStart = new Date(arMidnightISO(fecha)).toISOString();
    const windowEnd = new Date(arMidnightISO(addDaysISO(fecha, 2))).toISOString();

    const { error: ovErr } = await supabaseAdmin
      .from("reservas")
      .select("id_reserva")
      .eq("id_club", id_club)
      .eq("id_cancha", id_cancha)
      .in("estado", ["confirmada", "pendiente_pago"]) 
      .lt("inicio_ts", windowEnd)
      .gt("fin_ts", windowStart)
      .limit(200);

    if (ovErr) {
      return NextResponse.json(
        { error: `Error validando solapes: ${ovErr.message}` },
        { status: 500 }
      );
    }

    // Si tenés inicio_ts/fin_ts bien generados por trigger, este check es solo defensivo.
    // No podemos calcular rangos exactos sin replicar tu lógica de timestamps acá,
    // así que el "constraint EXCLUDE" sigue siendo la verdad final.

    // 1) Calcular precio (reusa tu endpoint)
    const calcRes = await fetch(
      new URL("/api/reservas/calcular-precio", req.url),
      {
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
          // si tu calcular-precio lo soporta:
          segmento_override,
        }),
        cache: "no-store",
      }
    );

    const calcJson = await calcRes.json().catch(() => null);
    if (!calcRes.ok || !calcJson?.ok) {
      return NextResponse.json(
        {
          error: calcJson?.error || "No se pudo calcular el precio",
          detail: calcJson,
        },
        { status: calcRes.status || 409 }
      );
    }

    const precio_total = Number(calcJson?.precio_total || 0);
    if (!Number.isFinite(precio_total) || precio_total <= 0) {
      return NextResponse.json(
        { error: "Precio inválido calculado" },
        { status: 409 }
      );
    }

    const id_tarifario = Number(calcJson?.id_tarifario ?? null);
    const id_regla = Number(calcJson?.id_regla ?? null);
    const segmento = (calcJson?.segmento ?? segmento_override) as Segmento;

    // 2) Anticipo del club
    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, anticipo_porcentaje")
      .eq("id_club", id_club)
      .maybeSingle();

    if (cErr)
      return NextResponse.json(
        { error: `Error leyendo club: ${cErr.message}` },
        { status: 500 }
      );
    if (!club)
      return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });

    const anticipo_porcentaje = Number((club as any).anticipo_porcentaje ?? 50);
    const pct = Math.min(100, Math.max(0, anticipo_porcentaje));
    const monto_anticipo = round2(precio_total * (pct / 100));

    // 3) Insert reserva confirmada (admin)
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("reservas")
      .insert({
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
        origen: "admin",
        creado_por: adminUserId,
        expires_at: null,
      })
      .select("id_reserva")
      .single();

    if (insErr) {
      // EXCLUDE constraint => Postgres exclusion_violation
      if ((insErr as any).code === "23P01") {
        return NextResponse.json({ error: "TURNOS_SOLAPADOS" }, { status: 409 });
      }
      return NextResponse.json(
        { error: `Error creando reserva: ${insErr.message}`, detail: insErr },
        { status: 500 }
      );
    }

    const id_reserva = Number((inserted as any)?.id_reserva);

    return NextResponse.json({
      ok: true,
      id_reserva,
      id_club,
      id_cancha,
      fecha,
      inicio,
      fin,
      fin_dia_offset,
      duracion_min,
      precio_total,
      segmento,
      tipo_turno,
      anticipo_porcentaje: pct,
      monto_anticipo,
    });
  } catch (e: any) {
    console.error("[POST /api/admin/reservas] ex:", e);
    return NextResponse.json(
      { error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}
