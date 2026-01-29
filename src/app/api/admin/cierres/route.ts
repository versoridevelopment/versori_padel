import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Ajustá esto si ya lo tenés en otro lado
async function assertAdminOrStaff(id_club: number, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("roles!inner(nombre)")
    .eq("id_club", id_club)
    .eq("id_usuario", userId)
    .in("roles.nombre", ["admin", "staff"])
    .limit(1);

  return !(error || !data || data.length === 0);
}

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isHHMM(s: string) {
  return /^\d{2}:\d{2}$/.test(s);
}

type CreateBody = {
  id_club: number;
  id_cancha?: number | null;
  fecha: string;              // YYYY-MM-DD
  cierre_total: boolean;      // true => inicio/fin null
  inicio?: string | null;     // HH:MM
  fin?: string | null;        // HH:MM
  cruza_medianoche?: boolean; // si true => fin_dia_offset=1
  motivo?: string | null;
  activo?: boolean;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id_club = Number(url.searchParams.get("id_club"));
    const fecha = url.searchParams.get("fecha"); // opcional
    const id_cancha = url.searchParams.get("id_cancha"); // opcional
    const include_inactivos = url.searchParams.get("include_inactivos") === "1";

    if (!id_club) return NextResponse.json({ error: "id_club requerido" }, { status: 400 });

    // Auth
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const ok = await assertAdminOrStaff(id_club, userId);
    if (!ok) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    let q = supabaseAdmin
      .from("club_cierres")
      .select("id_cierre,id_club,id_cancha,fecha,inicio,fin,fin_dia_offset,motivo,activo,created_at")
      .eq("id_club", id_club)
      .order("fecha", { ascending: true })
      .order("created_at", { ascending: false });

    if (fecha) {
      if (!isISODate(fecha)) return NextResponse.json({ error: "fecha inválida" }, { status: 400 });
      q = q.eq("fecha", fecha);
    }

    if (id_cancha !== null && id_cancha !== undefined && id_cancha !== "") {
      const n = Number(id_cancha);
      if (!n) return NextResponse.json({ error: "id_cancha inválido" }, { status: 400 });
      q = q.eq("id_cancha", n);
    }

    if (!include_inactivos) q = q.eq("activo", true);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, cierres: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateBody;

    const id_club = Number(body.id_club);
    const id_cancha = body.id_cancha ? Number(body.id_cancha) : null;
    const fecha = body.fecha;

    if (!id_club) return NextResponse.json({ error: "id_club requerido" }, { status: 400 });
    if (!fecha || !isISODate(fecha)) return NextResponse.json({ error: "fecha inválida" }, { status: 400 });

    // Auth
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const ok = await assertAdminOrStaff(id_club, userId);
    if (!ok) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    const cierre_total = !!body.cierre_total;

    let inicio: string | null = null;
    let fin: string | null = null;
    let fin_dia_offset: 0 | 1 = 0;

    if (!cierre_total) {
      if (!body.inicio || !body.fin) {
        return NextResponse.json({ error: "inicio/fin requeridos si no es cierre_total" }, { status: 400 });
      }
      if (!isHHMM(body.inicio) || !isHHMM(body.fin)) {
        return NextResponse.json({ error: "inicio/fin deben ser HH:MM" }, { status: 400 });
      }
      inicio = body.inicio;
      fin = body.fin;
      fin_dia_offset = body.cruza_medianoche ? 1 : 0;
    }

    // Validación simple: si no cruza medianoche, fin debe ser > inicio
    if (!cierre_total && fin_dia_offset === 0) {
      const [ih, im] = inicio!.split(":").map(Number);
      const [fh, fm] = fin!.split(":").map(Number);
      const a = ih * 60 + im;
      const b = fh * 60 + fm;
      if (b <= a) {
        return NextResponse.json(
          { error: "fin debe ser mayor que inicio (o marcá cruza medianoche)" },
          { status: 400 }
        );
      }
    }

    const insert = {
      id_club,
      id_cancha,
      fecha,
      inicio,
      fin,
      fin_dia_offset,
      motivo: body.motivo ?? null,
      activo: body.activo ?? true,
    };

    const { data, error } = await supabaseAdmin
      .from("club_cierres")
      .insert(insert)
      .select("id_cierre,id_club,id_cancha,fecha,inicio,fin,fin_dia_offset,motivo,activo,created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, cierre: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
