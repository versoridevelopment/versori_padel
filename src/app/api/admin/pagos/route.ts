import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

// Helper para responder JSON asegurando que los BigInt se pasen a string
function jsonResponse(data: any, status = 200) {
  const jsonString = JSON.stringify(data, (key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return new NextResponse(jsonString, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const headersList = await headers();
    const host = headersList.get("host") || "";

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
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // 2. Detectar Club
    let currentClubId: number | null = null;
    const subdomain = host.split(".")[0];

    // Lógica Subdominio
    if (subdomain && subdomain !== "localhost" && subdomain !== "www") {
      const { data: clubData } = await supabase
        .from("clubes")
        .select("id_club")
        .eq("subdominio", subdomain)
        .single();

      if (clubData) {
        const { data: membership } = await supabase
          .from("club_usuarios")
          .select("id_club")
          .eq("id_usuario", user.id)
          .eq("id_club", clubData.id_club)
          .maybeSingle();

        if (membership) currentClubId = membership.id_club;
      }
    }

    // Fallback Localhost
    if (!currentClubId) {
      const { data: defaultClub } = await supabase
        .from("club_usuarios")
        .select("id_club")
        .eq("id_usuario", user.id)
        .limit(1)
        .maybeSingle();

      if (defaultClub) currentClubId = defaultClub.id_club;
    }

    if (!currentClubId) {
      return jsonResponse({ pagos: [] });
    }

    // 3. Consulta (CORREGIDA: Eliminada la columna 'method')
    const { data: pagosData, error: dbError } = await supabase
      .from("reservas_pagos")
      .select(
        `
        id_pago,
        mp_payment_id,
        amount,
        status,
        created_at,
        provider,
        raw, 
        reservas (
          id_usuario,
          cliente_nombre,
          cliente_email,
          cliente_telefono
        )
      `,
      )
      .eq("id_club", currentClubId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (dbError) {
      console.error("Error DB:", dbError.message);
      return jsonResponse({ error: dbError.message }, 500);
    }

    const safePagosData = pagosData || [];

    // 4. Perfiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userIds = Array.from(
      new Set(
        safePagosData
          .map((p: any) => {
            const r = Array.isArray(p.reservas) ? p.reservas[0] : p.reservas;
            return r?.id_usuario;
          })
          .filter(Boolean),
      ),
    );

    const profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id_usuario, nombre, apellido, email")
        .in("id_usuario", userIds);
      profiles?.forEach((p) => {
        profilesMap[p.id_usuario] = p;
      });
    }

    // 5. Mapeo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagosFormateados = safePagosData.map((p: any) => {
      const reserva = Array.isArray(p.reservas) ? p.reservas[0] : p.reservas;
      const perfil = reserva?.id_usuario
        ? profilesMap[reserva.id_usuario]
        : null;

      const cliente = {
        nombre:
          perfil?.nombre ||
          reserva?.cliente_nombre?.split(" ")[0] ||
          "Invitado",
        apellido:
          perfil?.apellido ||
          reserva?.cliente_nombre?.split(" ").slice(1).join(" ") ||
          "",
        email: perfil?.email || reserva?.cliente_email || "Sin email",
      };

      // Extracción desde RAW (porque la columna 'method' no existe)
      const rawData = p.raw || {};
      // MercadoPago suele guardar el tipo en 'payment_type_id' dentro del JSON
      const paymentType = rawData.payment_type_id || rawData.payment_method_id;
      const cardLast4 = rawData.card?.last_four_digits || null;

      let metodoDetalle = "Efectivo / Otro";
      if (p.provider === "mercadopago") {
        metodoDetalle = "Mercado Pago";

        if (paymentType === "credit_card" || paymentType === "debit_card") {
          metodoDetalle = cardLast4 ? `Tarjeta •••• ${cardLast4}` : "Tarjeta";
        } else if (paymentType === "account_money") {
          metodoDetalle = "Dinero en Cuenta";
        } else if (paymentType === "ticket") {
          metodoDetalle = "Rapipago / PagoFácil";
        }
      }

      return {
        id_pago: p.id_pago, // El helper jsonResponse manejará el BigInt
        mp_payment_id: p.mp_payment_id,
        monto: Number(p.amount),
        estado: p.status,
        fecha: p.created_at,
        cliente: cliente,
        metodo_detalle: metodoDetalle,
      };
    });

    return jsonResponse({ pagos: pagosFormateados });
  } catch (error: any) {
    console.error("FATAL ERROR API:", error);
    return jsonResponse({ error: error.message || "Error interno" }, 500);
  }
}
