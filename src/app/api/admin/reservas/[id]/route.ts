import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Helper de permisos (copiado para que sea standalone)
async function assertAdminOrStaff(id_club: number, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("roles!inner(nombre)")
    .eq("id_club", id_club)
    .eq("id_usuario", userId)
    .in("roles.nombre", ["admin", "staff"])
    .limit(1);

  if (error || !data || data.length === 0) return false;
  return true;
}

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params; // ✅ Next 15: params es Promise
    const id_reserva = Number(id);

    if (!id_reserva || Number.isNaN(id_reserva)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // 1. Auth (Seguridad básica)
    const supabase = await getSupabaseServerClient();
    const { data: authRes } = await supabase.auth.getUser();
    if (!authRes?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authRes.user.id;

    // 2. Fetch Full Data
    const { data: reserva, error } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        *,
        cancha:canchas(nombre),
        profile:profiles(id_usuario, nombre, apellido, telefono, email),
        pagos:reservas_pagos(*)
      `
      )
      .eq("id_reserva", id_reserva)
      .single();

    if (error || !reserva) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    // 3. Verificar permisos sobre el club de la reserva
    const hasAccess = await assertAdminOrStaff(reserva.id_club, userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // 4. Normalizar Datos
    // Prioridad: Datos en reserva (invitado) > Datos en perfil (registrado)
    const cliente_nombre = (
      reserva.cliente_nombre ||
      (reserva.profile ? `${reserva.profile.nombre} ${reserva.profile.apellido}` : "")
    )
      .trim() || "Sin nombre";

    const cliente_telefono = reserva.cliente_telefono || reserva.profile?.telefono || "";
    const cliente_email = reserva.cliente_email || reserva.profile?.email || "";

    // Calcular totales financieros
    const pagosAprobados = (reserva.pagos || [])
      .filter((p: any) => p.status === "approved")
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    const precio_total = Number(reserva.precio_total) || 0;
    const saldo = Math.max(0, precio_total - pagosAprobados);
    const pagado_total = saldo === 0 && precio_total > 0;

    return NextResponse.json({
      ok: true,
      data: {
        ...reserva,
        cliente_nombre,
        cliente_telefono,
        cliente_email,
        pagos_aprobados_total: pagosAprobados,
        saldo_pendiente: saldo,
        pagado_total, // ✅ NUEVO
        pagos_historial: reserva.pagos,
      },
    });
  } catch (e: any) {
    console.error("[GET /api/admin/reservas/[id]]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
