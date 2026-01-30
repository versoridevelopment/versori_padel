import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// --- TIPOS ---
type CanchaRow = {
  id_cancha: number;
  id_club: number;
  id_tipo_cancha: number | null;
  id_tarifario: number | null;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  es_exterior: boolean | null;
  activa: boolean | null;
  theme?: string; // Para el frontend
};

type ReglaRow = {
  id_tarifario: number;
  hora_desde: string;
  hora_hasta: string;
  cruza_medianoche: boolean | null;
  dow: number | null;
};

// --- HELPERS ---
function arDateISO(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function arMidnightISO(dateISO: string) {
  return `${dateISO}T00:00:00-03:00`;
}

function toMin(hhmmss: string) {
  const s = (hhmmss || "").slice(0, 5);
  const [h, m] = s.split(":").map((x) => Number(x));
  return h * 60 + (m || 0);
}

function weekday0Sun(fechaISO: string) {
  const d = new Date(`${fechaISO}T00:00:00`);
  return d.getDay();
}

function roundDownToHalfHour(min: number) {
  return Math.floor(min / 30) * 30;
}
function roundUpToHalfHour(min: number) {
  return Math.ceil(min / 30) * 30;
}
function minToHourDecimal(min: number) {
  return Math.round((min / 60) * 2) / 2;
}

function pickThemeByIndex(idx: number) {
  const themes = ["blue", "purple", "green", "orange", "rose"] as const;
  return themes[idx % themes.length];
}

function parseHost(req: Request) {
  const raw = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  ).toLowerCase();
  return raw.split(":")[0];
}

function getSubdomain(hostNoPort: string) {
  const parts = hostNoPort.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[parts.length - 1] === "localhost") return parts[0] ?? null;
  if (parts.length >= 3) return parts[0];
  return null;
}

async function resolveClubIdBySubdomain(sub: string): Promise<number | null> {
  if (!sub || sub === "www") return null;
  const { data, error } = await supabaseAdmin
    .from("clubes")
    .select("id_club")
    .eq("subdominio", sub)
    .maybeSingle();

  if (error) {
    console.error("[resolveClubIdBySubdomain] error:", error);
    return null;
  }
  return data?.id_club ? Number(data.id_club) : null;
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
      error: "No tenés permisos en este club",
    };
  return { ok: true as const };
}

function parseTsAR(ts: string) {
  const s = String(ts || "");
  if (/[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s))
    return new Date(s).getTime();
  return new Date(`${s}-03:00`).getTime();
}

// --- MAIN HANDLER ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get("fecha") || arDateISO(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json(
        { error: "fecha inválida (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    // 1. Resolver Club
    const hostNoPort = parseHost(req);
    const sub = getSubdomain(hostNoPort);
    const clubFromSub = sub ? await resolveClubIdBySubdomain(sub) : null;
    const idClubFromQuery = Number(searchParams.get("id_club"));
    const id_club =
      clubFromSub ??
      (Number.isFinite(idClubFromQuery) && idClubFromQuery > 0
        ? idClubFromQuery
        : null);

    if (!id_club) {
      return NextResponse.json(
        { error: "No se pudo resolver el club" },
        { status: 400 },
      );
    }

    // 2. Auth
    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr || !authRes?.user?.id)
      return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });
    const userId = authRes.user.id;

    // 3. Permisos
    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok)
      return NextResponse.json({ error: perm.error }, { status: perm.status });

    // 4. Canchas
    const { data: canchasRaw, error: cErr } = await supabaseAdmin
      .from("canchas")
      .select(
        "id_cancha,id_club,id_tipo_cancha,id_tarifario,nombre,descripcion,imagen_url,es_exterior,activa",
      )
      .eq("id_club", id_club)
      .eq("activa", true)
      .order("id_cancha", { ascending: true })
      .returns<CanchaRow[]>();

    if (cErr)
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    const canchas = canchasRaw || [];

    // 5. Lógica de Horarios (Start/End Hour)
    const { data: defaultsRaw } = await supabaseAdmin
      .from("club_tarifarios_default")
      .select("id_tipo_cancha,id_tarifario")
      .eq("id_club", id_club);

    const defaultMap = new Map<number, number>();
    (defaultsRaw || []).forEach((row: any) =>
      defaultMap.set(row.id_tipo_cancha, row.id_tarifario),
    );

    const canchaTarifario = new Map<number, number>();
    const tarifariosSet = new Set<number>();
    canchas.forEach((c) => {
      const t =
        c.id_tarifario ??
        (c.id_tipo_cancha ? defaultMap.get(c.id_tipo_cancha) : null);
      if (t) {
        canchaTarifario.set(c.id_cancha, t);
        tarifariosSet.add(t);
      }
    });

    // Default hours
    let minStart = 8 * 60;
    let maxEnd = 26 * 60;

    if (tarifariosSet.size > 0) {
      const dow = weekday0Sun(fecha);
      const { data: reglas } = await supabaseAdmin
        .from("canchas_tarifas_reglas")
        .select(
          "hora_desde,hora_hasta,cruza_medianoche,dow,vigente_desde,vigente_hasta",
        )
        .in("id_tarifario", Array.from(tarifariosSet))
        .eq("activo", true)
        .eq("segmento", "publico")
        .or(`dow.is.null,dow.eq.${dow}`)
        .lte("vigente_desde", fecha)
        .or(`vigente_hasta.is.null,vigente_hasta.gte.${fecha}`);

      if (reglas && reglas.length > 0) {
        let localMin = Infinity,
          localMax = 0;
        reglas.forEach((r: any) => {
          const s = toMin(r.hora_desde);
          const eBase = toMin(r.hora_hasta);
          const e = r.cruza_medianoche || eBase <= s ? eBase + 1440 : eBase;
          localMin = Math.min(localMin, s);
          localMax = Math.max(localMax, e);
        });
        if (localMin !== Infinity) minStart = roundDownToHalfHour(localMin);
        if (localMax > 0) maxEnd = roundUpToHalfHour(localMax);
        if (maxEnd <= minStart) {
          minStart = 8 * 60;
          maxEnd = 26 * 60;
        }
      }
    }

    const startHour = minToHourDecimal(minStart);
    const endHour = minToHourDecimal(maxEnd);

    // 6. Fetch Reservas
    const dayStartMs = new Date(arMidnightISO(fecha)).getTime();
    const windowStartMs = dayStartMs;
    const windowEndMs = dayStartMs + maxEnd * 60_000;
    const windowStartISO = new Date(windowStartMs).toISOString();
    const windowEndISO = new Date(windowEndMs).toISOString();

    const { data: reservasRaw, error: resErr } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        id_reserva, id_club, id_cancha, id_usuario, 
        fecha, inicio, fin, fin_dia_offset, estado, 
        precio_total, monto_anticipo, segmento, tipo_turno,
        cliente_nombre, cliente_telefono, cliente_email,
        notas, origen,
        inicio_ts, fin_ts,
        reservas_pagos ( amount, status )
      `,
      ) // ✅ UPDATE: Se agregaron cliente_telefono, cliente_email, notas, origen
      .eq("id_club", id_club)
      .in("estado", ["confirmada", "pendiente_pago"])
      .lt("inicio_ts", windowEndISO)
      .gt("fin_ts", windowStartISO)
      .order("inicio_ts", { ascending: true });

    if (resErr) throw new Error(resErr.message);

    // Filtrar por parseTsAR (seguridad zona horaria)
    const reservasValidas = (reservasRaw || []).filter((r: any) => {
      const s = parseTsAR(r.inicio_ts);
      const e = parseTsAR(r.fin_ts);
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return false;
      return s < windowEndMs && windowStartMs < e;
    });

    // 7. Profiles LITE (Solo datos necesarios)
    const userIds = Array.from(
      new Set(reservasValidas.map((r: any) => r.id_usuario).filter(Boolean)),
    );
    const profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id_usuario, nombre, apellido, email, telefono") // ✅ UPDATE: Se agregaron email y teléfono
        .in("id_usuario", userIds);
      profs?.forEach((p: any) => profilesMap.set(p.id_usuario, p));
    }

    // 8. Output Mapping
    const canchasOut = canchas.map((c, idx) => ({
      ...c,
      es_exterior: !!c.es_exterior,
      theme: pickThemeByIndex(idx),
      id_tarifario: canchaTarifario.get(c.id_cancha) ?? null,
    }));

    const reservasOut = reservasValidas.map((r: any) => {
      // Datos del Perfil (Si existe usuario registrado)
      const prof = r.id_usuario ? profilesMap.get(r.id_usuario) : null;

      // Lógica de Prioridad: Datos Manuales > Datos de Perfil > Fallback
      const nombreProfile = prof
        ? [prof.nombre, prof.apellido].filter(Boolean).join(" ")
        : "";

      const cliente_nombre = (
        r.cliente_nombre ||
        nombreProfile ||
        "Sin nombre"
      ).trim();
      const cliente_telefono = r.cliente_telefono || prof?.telefono || "";
      const cliente_email = r.cliente_email || prof?.email || "";

      // Saldo (DEBE)
      const totalPagado =
        r.reservas_pagos
          ?.filter((p: any) => p.status === "approved")
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

      const precio = Number(r.precio_total || 0);
      const saldo = Math.max(0, precio - totalPagado);
      const pagado_total = precio > 0 && saldo === 0;

      return {
        id_reserva: r.id_reserva,
        id_cancha: r.id_cancha,
        fecha: r.fecha,
        horaInicio: String(r.inicio).slice(0, 5),
        horaFin: String(r.fin).slice(0, 5),
        fin_dia_offset: Number(r.fin_dia_offset || 0),
        estado: r.estado,
        precio_total: precio,
        saldo_pendiente: saldo,
        segmento: r.segmento,
        tipo_turno: r.tipo_turno || "normal",

        // Datos del cliente mapeados
        cliente_nombre,
        cliente_telefono,
        cliente_email,
        notas: r.notas || "",
        origen: r.origen || "web",

        pagos_aprobados_total: totalPagado,
        pagado_total,
      };
    });

    const res = NextResponse.json({
      ok: true,
      id_club,
      fecha,
      startHour,
      endHour,
      canchas: canchasOut,
      reservas: reservasOut,
    });

    res.headers.set("Cache-Control", "no-store, no-cache, max-age=0");
    return res;
  } catch (e: any) {
    console.error("[GET /api/admin/agenda] ex:", e);
    return NextResponse.json(
      { error: e?.message || "Error interno" },
      { status: 500 },
    );
  }
}
