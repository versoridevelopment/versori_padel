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
    .in("roles.nombre", ["admin", "staff"])
    .limit(1);

  if (error) return { ok: false as const, status: 500, error: `Error validando rol: ${error.message}` };
  if (!data || data.length === 0) return { ok: false as const, status: 403, error: "No tenés permisos admin/staff en este club" };
  return { ok: true as const };
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
  cancelar_futuras?: boolean;
  motivo?: string | null;
  incluir_hoy?: boolean;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id_turno_fijo = Number(resolvedParams.id);
    
    if (!id_turno_fijo) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Body | null;
    const id_club = Number(body?.id_club || 0);
    const cancelar_futuras = body?.cancelar_futuras ?? true;
    const incluir_hoy = body?.incluir_hoy ?? true;
    const motivo = (body?.motivo ?? "Turno fijo desactivado").toString();

    if (!id_club) return NextResponse.json({ error: "id_club requerido" }, { status: 400 });

    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr) return NextResponse.json({ error: "No se pudo validar sesión" }, { status: 401 });
    const userId = authRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });

    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status });

    const { data: tf, error: tfErr } = await supabaseAdmin
      .from("turnos_fijos")
      .select("id_turno_fijo,id_club,activo")
      .eq("id_turno_fijo", id_turno_fijo)
      .maybeSingle();

    if (tfErr) return NextResponse.json({ error: tfErr.message }, { status: 500 });
    if (!tf || Number((tf as any).id_club) !== id_club) {
      return NextResponse.json({ error: "Turno fijo no encontrado" }, { status: 404 });
    }

    const { error: upErr } = await supabaseAdmin
      .from("turnos_fijos")
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq("id_turno_fijo", id_turno_fijo)
      .eq("id_club", id_club);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    let canceled_count = 0;

    if (cancelar_futuras) {
      const hoy = todayISO();
      const updatePayload: any = {
        estado: "cancelada",
        cancelado_por: userId,
        cancelado_at: new Date().toISOString(),
        motivo_cancelacion: motivo,
      };

      const base = supabaseAdmin
        .from("reservas")
        .update(updatePayload)
        .eq("id_club", id_club)
        .eq("id_turno_fijo", id_turno_fijo)
        .in("estado", ["confirmada", "pendiente_pago"]);

      const { data: upd, error: canErr } = incluir_hoy
        ? await base.gte("fecha", hoy).select("id_reserva")
        : await base.gt("fecha", hoy).select("id_reserva");

      if (canErr) return NextResponse.json({ error: canErr.message }, { status: 500 });
      canceled_count = Array.isArray(upd) ? upd.length : 0;
    }

    return NextResponse.json({ ok: true, id_turno_fijo, canceled_count });
  } catch (e: any) {
    console.error("[POST /api/admin/turnos-fijos/:id/desactivar] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}