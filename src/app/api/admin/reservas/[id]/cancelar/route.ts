import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  if (!data || data.length === 0) return { ok: false as const, status: 403, error: "No tenés permisos admin/staff" };
  return { ok: true as const };
}

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  try {
    const id_reserva = Number(ctx.params.id);
    if (!id_reserva || Number.isNaN(id_reserva)) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    // Auth
    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr) return NextResponse.json({ error: "No se pudo validar sesión" }, { status: 401 });
    const userId = authRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });

    // Leer reserva (para id_club + estado)
    const { data: reserva, error: rErr } = await supabaseAdmin
      .from("reservas")
      .select("id_reserva, id_club, estado")
      .eq("id_reserva", id_reserva)
      .maybeSingle();

    if (rErr) return NextResponse.json({ error: `Error leyendo reserva: ${rErr.message}` }, { status: 500 });
    if (!reserva) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

    const id_club = Number((reserva as any).id_club);

    // Permisos
    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status });

    // Cancelar
    const { error: uErr } = await supabaseAdmin
      .from("reservas")
      .update({
        estado: "cancelada",
      })
      .eq("id_reserva", id_reserva);

    if (uErr) return NextResponse.json({ error: `Error cancelando: ${uErr.message}` }, { status: 500 });

    return NextResponse.json({ ok: true, id_reserva });
  } catch (e: any) {
    console.error("[POST /api/admin/reservas/[id]/cancelar] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
