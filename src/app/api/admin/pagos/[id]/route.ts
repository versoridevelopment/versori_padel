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

    // 2. Club del Usuario
    const { data: userClub } = await supabase
      .from("club_usuarios")
      .select("id_club")
      .eq("id_usuario", user.id)
      .maybeSingle();

    const clubId = userClub?.id_club || 9;

    // 3. Obtener el Pago
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

    if (error || !pago) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 },
      );
    }

    // 4. DATOS DINÁMICOS DEL CLUB
    // Buscamos la info institucional para el ticket
    const { data: clubRaw } = await supabase
      .from("clubes")
      .select(
        `
        nombre,
        contacto (
          telefono ( numero ),
          direccion ( calle, altura_calle, barrio )
        )
      `,
      )
      .eq("id_club", clubId)
      .single();

    // Procesar datos del club (manejo de arrays de Supabase)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacto: any = Array.isArray(clubRaw?.contacto)
      ? clubRaw?.contacto[0]
      : clubRaw?.contacto;

    // Dirección
    const dirData = Array.isArray(contacto?.direccion)
      ? contacto?.direccion[0]
      : contacto?.direccion;
    const calle = dirData?.calle || "Dirección";
    const altura = dirData?.altura_calle || "S/N";
    const barrio = dirData?.barrio ? `, ${dirData.barrio}` : "";
    const clubDireccion = `${calle} ${altura}${barrio}`;

    // Teléfono
    const telData = Array.isArray(contacto?.telefono)
      ? contacto?.telefono[0]
      : contacto?.telefono;
    const clubTelefono = telData?.numero || "";

    // 5. Armado de Objetos (Igual que antes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reserva: any = Array.isArray(pago.reservas)
      ? pago.reservas[0]
      : pago.reservas;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canchaRaw: any = reserva?.canchas;
    const canchaNombre = Array.isArray(canchaRaw)
      ? canchaRaw[0]?.nombre
      : canchaRaw?.nombre || "Cancha";

    let perfilData = null;
    if (reserva?.id_usuario) {
      const { data: perfil } = await supabase
        .from("profiles")
        .select("id_usuario, nombre, apellido, email, telefono")
        .eq("id_usuario", reserva.id_usuario)
        .single();
      perfilData = perfil;
    }

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
      email: perfilData?.email || reserva?.cliente_email || "-",
      telefono: perfilData?.telefono || reserva?.cliente_telefono || "-",
    };

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
      // ✅ AQUÍ ESTÁ LA MAGIA: Datos dinámicos del club
      club: {
        nombre: clubRaw?.nombre || "Club Deportivo",
        direccion: clubDireccion,
        telefono: clubTelefono,
        cuit: "30-00000000-0", // Hardcodeado por ahora si no está en tu esquema
      },
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
