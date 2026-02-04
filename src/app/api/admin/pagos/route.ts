import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

// Helper para convertir BigInt a String y evitar errores 500
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
  const headersList = await headers();
  const host = headersList.get("host") || "";

  // Limpieza del host
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  let subdomain: string | null = null;

  if (parts.length > 1 && parts[0] !== "www") {
    subdomain = parts[0];
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    subdomain = null;
  }

  console.log(
    `🔍 [API PAGOS] Host: "${hostname}" | Subdominio: "${subdomain}"`,
  );

  try {
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

    // 1. Auth: Usuario logueado (Cualquiera)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    // 2. DETECTAR CLUB
    let currentClubId: number | null = null;

    // A. Búsqueda por Subdominio (MODIFICADO: SIN RESTRICCIÓN DE USUARIO)
    if (subdomain) {
      console.log(`🌍 [API] Buscando club por subdominio: "${subdomain}"...`);

      const { data: clubData } = await supabase
        .from("clubes")
        .select("id_club, nombre")
        .eq("subdominio", subdomain)
        .single();

      if (clubData) {
        // 🔥 CAMBIO: Asignamos el ID directamente sin verificar 'club_usuarios'
        currentClubId = clubData.id_club;
        console.log(
          `✅ [API] Club detectado: ${clubData.nombre} (ID: ${currentClubId}) - Modo Admin Global`,
        );
      } else {
        console.warn(`⚠️ [API] No existe club con subdominio "${subdomain}"`);
      }
    }

    // B. Fallback (Si no hay subdominio, tomamos el primero disponible)
    if (!currentClubId && !subdomain) {
      console.log("⚠️ [API] Sin subdominio. Usando Fallback...");
      const { data: defaultClub } = await supabase
        .from("club_usuarios")
        .select("id_club")
        .eq("id_usuario", user.id)
        .limit(1)
        .maybeSingle();

      if (defaultClub) {
        currentClubId = defaultClub.id_club;
      }
    }

    if (!currentClubId) {
      // Si llegamos aquí, es que no hay subdominio válido y el usuario no tiene clubes asignados para el fallback
      return jsonResponse({ pagos: [] });
    }

    // 3. CONSULTA DE PAGOS
    console.log(`⚡ [API] Consultando pagos para Club ID: ${currentClubId}`);

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
        id_club, 
        reservas!inner (
          id_club,
          id_usuario,
          cliente_nombre,
          cliente_email,
          cliente_telefono
        )
      `,
      )
      // Filtros estrictos por ID de Club
      .eq("id_club", currentClubId)
      .eq("reservas.id_club", currentClubId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (dbError) {
      console.error("❌ [API] Error SQL:", dbError.message);
      return jsonResponse({ error: dbError.message }, 500);
    }

    const safePagosData = pagosData || [];
    console.log(`📊 [API] Registros encontrados: ${safePagosData.length}`);

    // 4. Perfiles (Optimización)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userIds = Array.from(
      new Set(
        safePagosData
          .map((p: any) => {
            const r = p.reservas;
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

    // 5. Mapeo Final
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagosFormateados = safePagosData.map((p: any) => {
      const reserva = p.reservas;
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

      const rawData = p.raw || {};
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
      } else {
        if (paymentType === "cash" || !p.mp_payment_id) {
          metodoDetalle = "Efectivo";
        }
      }

      return {
        id_pago: Number(p.id_pago),
        mp_payment_id: p.mp_payment_id ? String(p.mp_payment_id) : "N/A",
        monto: Number(p.amount),
        estado: p.status,
        fecha: p.created_at,
        cliente: cliente,
        metodo_detalle: metodoDetalle,
      };
    });

    return jsonResponse({ pagos: pagosFormateados });
  } catch (error: any) {
    console.error("💀 [API] FATAL ERROR:", error);
    return jsonResponse({ error: error.message || "Error interno" }, 500);
  }
}
