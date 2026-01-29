import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const pagoId = Number(id);

    if (isNaN(pagoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // 1. Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Club
    const { data: userClub } = await supabase
      .from("club_usuarios")
      .select("id_club")
      .eq("id_usuario", user.id)
      .maybeSingle();

    const clubId = userClub?.id_club || 9;

    // 3. CONSULTA SEGURA (Paso 1: Pago + Reserva + Cancha)
    // No incluimos 'profiles' aquí para evitar el error de relación faltante
    const { data: pago, error } = await supabase
      .from("reservas_pagos")
      .select(
        `
        *,
        reservas (
          id_reserva,
          fecha,
          inicio,
          fin,
          precio_total,
          cliente_nombre,
          cliente_email,
          cliente_telefono,
          id_usuario,
          canchas ( nombre )
        )
      `,
      )
      .eq("id_pago", pagoId)
      .eq("id_club", clubId)
      .maybeSingle();

    if (error) {
      console.error("❌ Error DB Pago:", error);
      return NextResponse.json({ error: "Error interno DB" }, { status: 500 });
    }

    if (!pago) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 },
      );
    }

    // 4. Manejo de Arrays/Objetos (Reserva)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reserva: any = Array.isArray(pago.reservas)
      ? pago.reservas[0]
      : pago.reservas;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canchaRaw: any = reserva?.canchas;
    const canchaNombre = Array.isArray(canchaRaw)
      ? canchaRaw[0]?.nombre
      : canchaRaw?.nombre || "Cancha desconocida";

    // 5. CONSULTA SEGURA (Paso 2: Obtener Perfil si existe usuario)
    let perfilData = null;
    if (reserva?.id_usuario) {
      const { data: perfil } = await supabase
        .from("profiles")
        .select("id_usuario, nombre, apellido, email, telefono")
        .eq("id_usuario", reserva.id_usuario)
        .single();
      perfilData = perfil;
    }

    // 6. Armado del objeto Cliente
    const clienteData = {
      id_usuario: perfilData?.id_usuario || "invitado",
      nombre:
        perfilData?.nombre ||
        reserva?.cliente_nombre?.split(" ")[0] ||
        "Invitado",
      apellido:
        perfilData?.apellido ||
        reserva?.cliente_nombre?.split(" ").slice(1).join(" ") ||
        "",
      email: perfilData?.email || reserva?.cliente_email || "No especificado",
      telefono:
        perfilData?.telefono || reserva?.cliente_telefono || "No especificado",
    };

    // 7. Datos Raw MP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawMP = (pago.raw as any) || {};
    const cardLast4 =
      rawMP.card?.last_four_digits || rawMP.payment_method?.last_four_digits;

    const responseData = {
      id_pago: pago.id_pago,
      provider: pago.provider,
      status: pago.status,
      status_detail: pago.mp_status_detail || pago.status,
      amount: Number(pago.amount),
      currency: pago.currency,
      mp_payment_id: pago.mp_payment_id?.toString() || "N/A",
      created_at: pago.created_at,
      approved_at: pago.updated_at,
      method: pago.provider === "mercadopago" ? "Mercado Pago" : "Efectivo",
      cardLast4,
      cliente: clienteData,
      reserva: {
        id_reserva: reserva?.id_reserva || 0,
        fecha: reserva?.fecha,
        inicio: reserva?.inicio,
        fin: reserva?.fin,
        cancha: canchaNombre,
        precio_total_reserva: Number(reserva?.precio_total || 0),
      },
      raw: rawMP,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error API Detalle:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
