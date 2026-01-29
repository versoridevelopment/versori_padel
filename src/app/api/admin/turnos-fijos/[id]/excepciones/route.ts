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

type Body = {
  id_club: number;
  fecha: string; // YYYY-MM-DD
  accion: "skip" | "override";
  // override:
  inicio?: string | null; // HH:MM
  duracion_min?: 60 | 90 | 120 | null;
  id_cancha?: number | null;
  notas?: string | null;
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id_turno_fijo = Number(params.id);
    if (!id_turno_fijo) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as Body | null;
    const id_club = Number(body?.id_club || 0);
    const fecha = String(body?.fecha || "");
    const accion = body?.accion;

    if (!id_club) return NextResponse.json({ error: "id_club requerido" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return NextResponse.json({ error: "fecha inválida (YYYY-MM-DD)" }, { status: 400 });
    if (accion !== "skip" && accion !== "override") return NextResponse.json({ error: "accion inválida" }, { status: 400 });

    // Auth
    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr) return NextResponse.json({ error: "No se pudo validar sesión" }, { status: 401 });
    const userId = authRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "LOGIN_REQUERIDO" }, { status: 401 });

    // Permisos
    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status });

    // Verificar pertenencia
    const { data: tf, error: tfErr } = await supabaseAdmin
      .from("turnos_fijos")
      .select("id_turno_fijo,id_club")
      .eq("id_turno_fijo", id_turno_fijo)
      .maybeSingle();

    if (tfErr) return NextResponse.json({ error: tfErr.message }, { status: 500 });
    if (!tf || Number((tf as any).id_club) !== id_club) return NextResponse.json({ error: "Turno fijo no encontrado" }, { status: 404 });

    const payload: any = {
      id_turno_fijo,
      fecha,
      accion,
      notas: body?.notas ?? null,
    };

    if (accion === "override") {
      const inicio = String(body?.inicio || "");
      const duracion_min = Number(body?.duracion_min || 0);
      const id_cancha = Number(body?.id_cancha || 0);

      if (!/^\d{2}:\d{2}$/.test(inicio)) return NextResponse.json({ error: "inicio inválido (HH:MM)" }, { status: 400 });
      if (![60, 90, 120].includes(duracion_min)) return NextResponse.json({ error: "duracion_min inválida" }, { status: 400 });
      if (!id_cancha) return NextResponse.json({ error: "id_cancha requerido" }, { status: 400 });

      payload.inicio = inicio;
      payload.duracion_min = duracion_min;
      payload.id_cancha = id_cancha;
    } else {
      // skip: limpiar override fields
      payload.inicio = null;
      payload.duracion_min = null;
      payload.id_cancha = null;
    }

    // Upsert por unique(id_turno_fijo, fecha)
    const { error: upErr } = await supabaseAdmin
      .from("turnos_fijos_excepciones")
      .upsert(payload, { onConflict: "id_turno_fijo,fecha" });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /api/admin/turnos-fijos/:id/excepciones] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
