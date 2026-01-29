import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
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

    // 1. Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Club (Multi-tenant)
    let clubId = 9; // Fallback Dev
    const { data: userClub } = await supabase
      .from("club_usuarios")
      .select("id_club")
      .eq("id_usuario", user.id)
      .maybeSingle();

    if (userClub) clubId = userClub.id_club;

    // 3. Consulta Pagos + Reservas (SIN Profiles todavía)
    const { data: pagosData, error } = await supabase
      .from("reservas_pagos")
      .select(
        `
        id_pago,
        mp_payment_id,
        amount,
        status,
        created_at,
        provider,
        reservas (
          id_usuario,
          cliente_nombre,
          cliente_email,
          cliente_telefono
        )
      `,
      )
      .eq("id_club", clubId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error Supabase Pagos:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Obtener Perfiles manualmente (Para evitar error de FK faltante)
    // Extraemos todos los IDs de usuario únicos de las reservas
    const userIds = Array.from(
      new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pagosData
          .map((p: any) => {
            const r = Array.isArray(p.reservas) ? p.reservas[0] : p.reservas;
            return r?.id_usuario;
          })
          .filter(Boolean), // Filtramos nulos/undefined
      ),
    );

    const profilesMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id_usuario, nombre, apellido, email")
        .in("id_usuario", userIds);

      if (profiles) {
        // Creamos un mapa rápido { "uuid": { datos } }
        profiles.forEach((p) => {
          profilesMap[p.id_usuario] = p;
        });
      }
    }

    // 5. Transformación y Combinación
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagosFormateados = pagosData.map((p: any) => {
      // Manejo seguro: Supabase puede devolver un objeto o un array de 1 elemento
      const reservaRaw = p.reservas;
      const reserva = Array.isArray(reservaRaw) ? reservaRaw[0] : reservaRaw;

      // Buscamos el perfil en nuestro mapa usando el ID de la reserva
      const perfil = reserva?.id_usuario
        ? profilesMap[reserva.id_usuario]
        : null;

      // Prioridad: Perfil Registrado > Datos en Reserva (Invitado)
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

      return {
        id_pago: p.id_pago,
        mp_payment_id: p.mp_payment_id?.toString() || "N/A",
        monto: Number(p.amount),
        estado: p.status,
        fecha: p.created_at,
        cliente: cliente,
        metodo_detalle:
          p.provider === "mercadopago" ? "Mercado Pago" : "Efectivo",
      };
    });

    return NextResponse.json({ pagos: pagosFormateados });
  } catch (error) {
    console.error("Error API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
