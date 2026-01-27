import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSubdomainFromHost } from "@/lib/ObetenerClubUtils/tenantUtils";
import { getClubBySubdomain } from "@/lib/ObetenerClubUtils/getClubBySubdomain";

export const runtime = "nodejs";

function toInt(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function GET(req: Request) {
  try {
    // 1️⃣ Usuario logueado
    const supabase = await getSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes?.user) {
      return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });
    }

    const userId = userRes.user.id;

    // 2️⃣ Club por subdominio
    const url = new URL(req.url);
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      url.host;

    const sub = getSubdomainFromHost(host);
    if (!sub) {
      return NextResponse.json(
        { error: "No se pudo resolver el club" },
        { status: 400 }
      );
    }

    const club = await getClubBySubdomain(sub);
    if (!club?.id_club) {
      return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });
    }

    const id_club = Number(club.id_club);

    // 3️⃣ Filtros + paginación
    const sp = url.searchParams;

    const estado = sp.get("estado"); // confirmada|pendiente_pago|rechazada|expirada
    const desde = sp.get("desde");   // YYYY-MM-DD
    const hasta = sp.get("hasta");   // YYYY-MM-DD

    const page = Math.max(1, toInt(sp.get("page")) ?? 1);
    const pageSize = Math.min(50, Math.max(1, toInt(sp.get("page_size")) ?? 10));

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 4️⃣ Query base (con count exacto)
    let q = supabaseAdmin
      .from("reservas")
      .select(
        `
        id_reserva,
        fecha,
        inicio,
        fin,
        fin_dia_offset,
        estado,
        precio_total,
        monto_anticipo,
        confirmed_at,
        created_at,
        canchas:canchas ( nombre )
        `,
        { count: "exact" }
      )
      .eq("id_club", id_club)
      .eq("id_usuario", userId)
      .order("fecha", { ascending: false })
      .order("inicio", { ascending: false });

    if (estado) q = q.eq("estado", estado);
    if (desde) q = q.gte("fecha", desde);
    if (hasta) q = q.lte("fecha", hasta);

    const { data, error, count } = await q.range(from, to);

    if (error) {
      console.error("[mis-reservas] query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reservas = (data || []).map((r: any) => ({
      id_reserva: r.id_reserva,
      fecha: r.fecha,
      inicio: r.inicio,
      fin: r.fin,
      fin_dia_offset: r.fin_dia_offset,
      estado: r.estado,
      precio_total: r.precio_total,
      monto_anticipo: r.monto_anticipo,
      confirmed_at: r.confirmed_at,
      created_at: r.created_at,
      cancha_nombre: r.canchas?.nombre ?? null,
    }));

    return NextResponse.json({
      ok: true,
      subdominio: sub,
      id_club,
      page,
      page_size: pageSize,
      total: count ?? 0,
      total_pages: count ? Math.ceil(count / pageSize) : 0,
      reservas,
    });
  } catch (e: any) {
    console.error("[GET /api/mis-reservas] ex:", e);
    return NextResponse.json(
      { error: e?.message || "Error interno" },
      { status: 500 }
    );
  }
}
