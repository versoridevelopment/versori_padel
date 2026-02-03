// src/app/api/admin/turnos-fijos/[id]/route.ts
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

  if (error) return { ok: false as const, status: 500, error: error.message };
  if (!data || data.length === 0) return { ok: false as const, status: 403, error: "Sin permisos" };
  return { ok: true as const };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const id_turno_fijo = Number(id);

    const url = new URL(req.url);
    const id_club = Number(url.searchParams.get("id_club") || 0);

    if (!id_turno_fijo) {
      return NextResponse.json({ ok: false, error: "id_turno_fijo inválido" }, { status: 400 });
    }
    if (!id_club) {
      return NextResponse.json({ ok: false, error: "id_club requerido" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: authRes, error: aErr } = await supabase.auth.getUser();
    if (aErr) return NextResponse.json({ ok: false, error: "No se pudo validar sesión" }, { status: 401 });
    const userId = authRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ ok: false, error: "LOGIN_REQUERIDO" }, { status: 401 });

    const perm = await assertAdminOrStaff({ id_club, userId });
    if (!perm.ok) return NextResponse.json({ ok: false, error: perm.error }, { status: perm.status });

    const { data, error } = await supabaseAdmin
      .from("turnos_fijos")
      .select("*")
      .eq("id_club", id_club)
      .eq("id_turno_fijo", id_turno_fijo)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error("[GET /api/admin/turnos-fijos/:id] ex:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
  }
}
