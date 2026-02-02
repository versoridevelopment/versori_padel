import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// --- Helpers copiados para no depender de imports externos ---
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
    .in("roles.nombre", ["admin", "cajero", "staff"])
    .limit(1);
  if (error || !data?.length)
    return { ok: false as const, status: 403, error: "Sin permisos" };
  return { ok: true as const };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id_club = Number(body?.id_club);
    const id_cancha = Number(body?.id_cancha);
    const fecha = String(body?.fecha || "");
    const inicio = String(body?.inicio || "");
    const finFromBody = body?.fin ? String(body.fin) : "";
    const tipo_turno = String(body?.tipo_turno || "normal");
    const notas = body?.notas ?? null;
    const cliente_nombre = String(body?.cliente_nombre ?? "");
    const cliente_telefono = String(body?.cliente_telefono ?? "");
    const cliente_email = String(body?.cliente_email ?? "");

    if (!id_club || !id_cancha || !fecha || !inicio)
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    let duracion_min = Number(body?.duracion_min || 0);
    const startMin = toMin(inicio);
    if (!duracion_min && /^\d{2}:\d{2}$/.test(finFromBody)) {
      let endMin = toMin(finFromBody);
      if (endMin <= startMin) endMin += 1440;
      duracion_min = endMin - startMin;
    }
    if (duracion_min <= 0) duracion_min = 90;

    const endMinAbs = startMin + duracion_min;
    const fin = minToHHMM(endMinAbs);
    const fin_dia_offset = endMinAbs >= 1440 ? 1 : 0;

    const supabase = await getSupabaseServerClient();
    const { data: authRes } = await supabase.auth.getUser();
    if (!authRes?.user?.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const adminUserId = authRes.user.id;
    const perm = await assertAdminOrStaff({ id_club, userId: adminUserId });
    if (!perm.ok)
      return NextResponse.json(
        { error: perm.error },
        { status: perm.status as number },
      );

    // ✅ VALIDAR BLOQUEOS (CIERRES)
    const { data: cierres } = await supabaseAdmin
      .from("club_cierres")
      .select("inicio, fin, motivo")
      .eq("id_club", id_club)
      .eq("fecha", fecha)
      .eq("activo", true)
      .or(`id_cancha.is.null,id_cancha.eq.${id_cancha}`);

    if (cierres && cierres.length > 0) {
      for (const cierre of cierres) {
        if (!cierre.inicio || !cierre.fin) continue;
        const cS = toMin(cierre.inicio);
        const cE = toMin(cierre.fin);
        // Solapamiento
        if (startMin < cE && endMinAbs > cS) {
          return NextResponse.json(
            { error: `Horario bloqueado: ${cierre.motivo || "Cierre"}` },
            { status: 409 },
          );
        }
      }
    }

    // Validar reservas existentes
    const windowStart = new Date(arMidnightISO(fecha)).toISOString();
    const windowEnd = new Date(
      arMidnightISO(addDaysISO(fecha, 2)),
    ).toISOString();
    await supabaseAdmin
      .from("reservas")
      .select("id_reserva")
      .eq("id_club", id_club)
      .eq("id_cancha", id_cancha)
      .in("estado", ["confirmada", "pendiente_pago"])
      .lt("inicio_ts", windowEnd)
      .gt("fin_ts", windowStart)
      .limit(100);

    // Precio
    const precio_manual = !!body?.precio_manual;
    let precio_total = 0;
    if (precio_manual) {
      precio_total = Number(body?.precio_total_manual ?? 0);
    } else {
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
            segmento_override: tipo_turno === "profesor" ? "profe" : "publico",
          }),
        },
      );
      const calcJson = await calcRes.json().catch(() => null);
      precio_total = Number(calcJson?.precio_total || 0);
    }

    const { data: clubData } = await supabaseAdmin
      .from("clubes")
      .select("anticipo_porcentaje")
      .eq("id_club", id_club)
      .single();
    const pct = Number(clubData?.anticipo_porcentaje ?? 50);
    const monto_anticipo = round2(precio_total * (pct / 100));

    // Insert
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("reservas")
      .insert({
        id_club,
        id_cancha,
        fecha,
        inicio,
        fin,
        fin_dia_offset,
        estado: "confirmada",
        precio_total,
        anticipo_porcentaje: pct,
        monto_anticipo,
        tipo_turno,
        notas: notas || null,
        cliente_nombre: cliente_nombre.trim() || null,
        cliente_telefono: cliente_telefono.trim() || null,
        cliente_email: cliente_email.trim() || null,
        origen: "admin",
        creado_por: adminUserId,
        id_usuario: null,
      })
      .select("id_reserva")
      .single();

    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, id_reserva: inserted.id_reserva });
  } catch (e: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
