import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type PatchBody = {
  id_club: number;             // requerido para permisos
  id_cancha?: number | null;
  fecha?: string;
  cierre_total?: boolean;
  inicio?: string | null;      // HH:MM
  fin?: string | null;         // HH:MM
  cruza_medianoche?: boolean;  // => fin_dia_offset
  motivo?: string | null;
  activo?: boolean;
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id_cierre = Number(params.id);
    if (!id_cierre) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = (await req.json()) as PatchBody;
    const id_club = Number(body.id_club);
    if (!id_club) return NextResponse.json({ error: "id_club requerido" }, { status: 400 });

    // Auth
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const ok = await assertAdminOrStaff(id_club, userId);
    if (!ok) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    // Traer actual (para consistencia y evitar cambiar club sin querer)
    const { data: current, error: curErr } = await supabaseAdmin
      .from("club_cierres")
      .select("id_cierre,id_club,inicio,fin,fin_dia_offset")
      .eq("id_cierre", id_cierre)
      .single();

    if (curErr || !current) return NextResponse.json({ error: "No existe" }, { status: 404 });
    if (current.id_club !== id_club) return NextResponse.json({ error: "No coincide id_club" }, { status: 403 });

    const patch: any = {};

    if (body.id_cancha !== undefined) patch.id_cancha = body.id_cancha ? Number(body.id_cancha) : null;

    if (body.fecha !== undefined) {
      if (!body.fecha || !isISODate(body.fecha)) return NextResponse.json({ error: "fecha inválida" }, { status: 400 });
      patch.fecha = body.fecha;
    }

    if (body.motivo !== undefined) patch.motivo = body.motivo ?? null;
    if (body.activo !== undefined) patch.activo = !!body.activo;

    // Cambio de tipo total/parcial
    if (body.cierre_total === true) {
      patch.inicio = null;
      patch.fin = null;
      patch.fin_dia_offset = 0;
    } else if (body.cierre_total === false) {
      // si pasa a parcial, necesita inicio/fin
      if (!body.inicio || !body.fin) {
        return NextResponse.json({ error: "inicio/fin requeridos al pasar a parcial" }, { status: 400 });
      }
      if (!isHHMM(body.inicio) || !isHHMM(body.fin)) {
        return NextResponse.json({ error: "inicio/fin deben ser HH:MM" }, { status: 400 });
      }
      patch.inicio = body.inicio;
      patch.fin = body.fin;
      patch.fin_dia_offset = body.cruza_medianoche ? 1 : 0;

      if (patch.fin_dia_offset === 0) {
        const [ih, im] = patch.inicio.split(":").map(Number);
        const [fh, fm] = patch.fin.split(":").map(Number);
        if (fh * 60 + fm <= ih * 60 + im) {
          return NextResponse.json(
            { error: "fin debe ser mayor que inicio (o marcá cruza medianoche)" },
            { status: 400 }
          );
        }
      }
    } else {
      // no cambió "cierre_total" explícitamente, pero puede editar horas
      const wantsTimeEdit = body.inicio !== undefined || body.fin !== undefined || body.cruza_medianoche !== undefined;

      if (wantsTimeEdit) {
        // si el actual es total (inicio/fin null), para editar horas primero tendrías que pasar a parcial
        if (!current.inicio || !current.fin) {
          return NextResponse.json({ error: "Este cierre es total. Pasalo a parcial para editar horas." }, { status: 400 });
        }

        const inicio = body.inicio ?? current.inicio.slice(0,5);
        const fin = body.fin ?? current.fin.slice(0,5);
        if (!isHHMM(inicio) || !isHHMM(fin)) return NextResponse.json({ error: "inicio/fin deben ser HH:MM" }, { status: 400 });

        patch.inicio = inicio;
        patch.fin = fin;

        const fin_dia_offset = body.cruza_medianoche !== undefined ? (body.cruza_medianoche ? 1 : 0) : current.fin_dia_offset;
        patch.fin_dia_offset = fin_dia_offset;

        if (fin_dia_offset === 0) {
          const [ih, im] = inicio.split(":").map(Number);
          const [fh, fm] = fin.split(":").map(Number);
          if (fh * 60 + fm <= ih * 60 + im) {
            return NextResponse.json(
              { error: "fin debe ser mayor que inicio (o marcá cruza medianoche)" },
              { status: 400 }
            );
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from("club_cierres")
      .update(patch)
      .eq("id_cierre", id_cierre)
      .select("id_cierre,id_club,id_cancha,fecha,inicio,fin,fin_dia_offset,motivo,activo,created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, cierre: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id_cierre = Number(params.id);
    if (!id_cierre) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const url = new URL(req.url);
    const id_club = Number(url.searchParams.get("id_club"));
    if (!id_club) return NextResponse.json({ error: "id_club requerido" }, { status: 400 });

    // Auth
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const ok = await assertAdminOrStaff(id_club, userId);
    if (!ok) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

    // opcional: verificar que pertenece al club
    const { data: cur } = await supabaseAdmin
      .from("club_cierres")
      .select("id_club")
      .eq("id_cierre", id_cierre)
      .single();

    if (!cur) return NextResponse.json({ error: "No existe" }, { status: 404 });
    if (cur.id_club !== id_club) return NextResponse.json({ error: "No coincide id_club" }, { status: 403 });

    const { error } = await supabaseAdmin.from("club_cierres").delete().eq("id_cierre", id_cierre);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
