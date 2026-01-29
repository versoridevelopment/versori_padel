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

  // default: true
  incluir_hoy?: boolean;

  // default: false (solo futuras)
  incluir_pasadas?: boolean;

  motivo?: string | null;
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id_turno_fijo = Number(params.id);
    if (!id_turno_fijo) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Body | null;
    const id_club = Number(body?.id_club || 0);
    const incluir_hoy = body?.incluir_hoy ?? true;
    const incluir_pasadas = body?.incluir_pasadas ?? false;
    const motivo = (body?.motivo ?? "Cancelación masiva de instancias").toString();

    if (!id_club) return NextResponse.json({ error: "id_club requerido" }, { status: 400 });

    // Auth
    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr) return NextResponse.json({ error: "No se pudo validar sesión" }, { status: 401 });

    const userId = authRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });

    // Permisos
    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status });

    // Verificar que el turno fijo sea del club
    const { data: tf, error: tfErr } = await supabaseAdmin
      .from("turnos_fijos")
      .select("id_turno_fijo,id_club")
      .eq("id_turno_fijo", id_turno_fijo)
      .maybeSingle();

    if (tfErr) return NextResponse.json({ error: tfErr.message }, { status: 500 });
    if (!tf || Number((tf as any).id_club) !== id_club) {
      return NextResponse.json({ error: "Turno fijo no encontrado" }, { status: 404 });
    }

    const hoy = todayISO();

    const updatePayload: any = {
      estado: "cancelada",
      cancelado_por: userId,
      cancelado_at: new Date().toISOString(),
      motivo_cancelacion: motivo,
    };

    // Base: todas las reservas de ese turno fijo en estados activos
    const base = supabaseAdmin
      .from("reservas")
      .update(updatePayload)
      .eq("id_club", id_club)
      .eq("id_turno_fijo", id_turno_fijo)
      .in("estado", ["confirmada", "pendiente_pago"]);

    // Si incluir_pasadas=true => no filtramos por fecha
    // Si incluir_pasadas=false => filtramos desde hoy (>= o >)
    const { data: upd, error: canErr } = incluir_pasadas
      ? await base.select("id_reserva")
      : incluir_hoy
        ? await base.gte("fecha", hoy).select("id_reserva")
        : await base.gt("fecha", hoy).select("id_reserva");

    if (canErr) return NextResponse.json({ error: canErr.message }, { status: 500 });

    const canceled_count = Array.isArray(upd) ? upd.length : 0;

    return NextResponse.json({ ok: true, id_turno_fijo, canceled_count });
  } catch (e: any) {
    console.error("[POST /api/admin/turnos-fijos/:id/cancelar-instancias] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
