// src/app/api/admin/turnos-fijos/[id]/reservas/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function assertAdminOrStaff(params: { id_club: number; userId: string }) {
  const { id_club, userId } = params;

  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("id_usuario, id_club, roles!inner(nombre)")
    .eq("id_club", id_club)
    .eq("id_usuario", userId)
    .in("roles.nombre", ["admin", "cajero"])
    .limit(1);

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }
  if (!data || data.length === 0) {
    return { ok: false as const, status: 403, error: "Sin permisos" };
  }
  return { ok: true as const };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const id_turno_fijo = Number(id);

    const url = new URL(req.url);
    const id_club = Number(url.searchParams.get("id_club") || 0);

    const from = url.searchParams.get("from"); // YYYY-MM-DD
    const to = url.searchParams.get("to"); // YYYY-MM-DD
    const estado = url.searchParams.get("estado"); // confirmada | pendiente_pago | cancelada | expirada ...

    if (!id_turno_fijo) {
      return NextResponse.json({ ok: false, error: "id_turno_fijo inválido" }, { status: 400 });
    }
    if (!id_club) {
      return NextResponse.json({ ok: false, error: "id_club requerido" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr) {
      return NextResponse.json({ ok: false, error: "No se pudo validar sesión" }, { status: 401 });
    }
    const userId = authRes?.user?.id ?? null;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUERIDO" }, { status: 401 });
    }

    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok) {
      return NextResponse.json({ ok: false, error: perm.error }, { status: perm.status });
    }

    let q = supabaseAdmin
      .from("reservas")
      .select(
        "id_reserva,fecha,inicio,fin,fin_dia_offset,estado,precio_total,segmento,cliente_nombre,cliente_telefono,created_at",
      )
      .eq("id_club", id_club)
      .eq("id_turno_fijo", id_turno_fijo)
      .order("fecha", { ascending: true })
      .order("inicio", { ascending: true });

    if (from) q = q.gte("fecha", from);
    if (to) q = q.lte("fecha", to);
    if (estado) q = q.eq("estado", estado);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (e: any) {
    console.error("[GET /api/admin/turnos-fijos/:id/reservas] ex:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}
