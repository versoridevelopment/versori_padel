import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getClubMpAccessToken } from "@/lib/mercadopago/getClubMpToken";

export const runtime = "nodejs";

function isExpired(expires_at: string) {
  const t = new Date(expires_at).getTime();
  return !Number.isFinite(t) || t <= Date.now();
}

function isLocalhost(u: string) {
  return u.includes("localhost") || u.includes("127.0.0.1") || u.includes(".localhost");
}

function hhmm(v: any) {
  const s = String(v || "");
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function safeStr(v: any, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

// MP: statement_descriptor ~22 chars, sin símbolos raros
function statementDescriptorFromClub(name: string) {
  const clean = safeStr(name, "CLUB")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sin tildes
    .replace(/[^A-Z0-9 ]/g, "") // solo A-Z 0-9 espacio
    .replace(/\s+/g, " ")
    .trim();

  return clean.slice(0, 22) || "CLUB";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { searchParams } = url;

    const origin = url.origin;

    // ✅ Base pública para MP (ngrok en local)
    const baseUrl = (process.env.MP_BASE_URL || origin).replace(/\/$/, "");
    if (isLocalhost(baseUrl)) {
      return NextResponse.json(
        {
          error:
            "MP_BASE_URL no configurado (Mercado Pago no acepta localhost en back_urls/notification_url).",
          hint:
            "Usá ngrok: `ngrok http 3000` y poné MP_BASE_URL=https://xxxx.ngrok-free.app en .env.local",
          baseUrl_detected: baseUrl,
        },
        { status: 400 }
      );
    }

    const id_reserva = Number(searchParams.get("id_reserva"));
    const id_pago = Number(searchParams.get("id_pago"));

    if (!id_reserva || Number.isNaN(id_reserva)) {
      return NextResponse.json({ error: "id_reserva inválido" }, { status: 400 });
    }
    if (!id_pago || Number.isNaN(id_pago)) {
      return NextResponse.json({ error: "id_pago inválido" }, { status: 400 });
    }

    // 1) Leer reserva (ahora traemos datos para armar el detalle)
    const { data: reserva, error: rErr } = await supabaseAdmin
      .from("reservas")
      .select("id_reserva,id_club,id_cancha,estado,expires_at,fecha,inicio,fin,fin_dia_offset")
      .eq("id_reserva", id_reserva)
      .maybeSingle();

    if (rErr) {
      return NextResponse.json({ error: `Error leyendo reserva: ${rErr.message}` }, { status: 500 });
    }
    if (!reserva) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    if (reserva.estado !== "pendiente_pago") {
      return NextResponse.json(
        { error: `La reserva no está pendiente de pago (estado=${reserva.estado})` },
        { status: 409 }
      );
    }

    if (isExpired(reserva.expires_at)) {
      return NextResponse.json({ error: "La reserva expiró" }, { status: 410 });
    }

    // 1.1) Leer club (subdominio para retorno + nombre para detalle)
    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, subdominio, nombre")
      .eq("id_club", reserva.id_club)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json({ error: `Error leyendo club: ${cErr.message}` }, { status: 500 });
    }
    if (!club?.subdominio) {
      return NextResponse.json({ error: "El club no tiene subdominio configurado" }, { status: 500 });
    }

    const tenant = String(club.subdominio);
    const clubNombre = safeStr(club.nombre, `Club #${reserva.id_club}`);

    // 1.2) Leer cancha (nombre para detalle)
    let canchaNombre = "Cancha";
    if (reserva.id_cancha) {
      const { data: cancha, error: caErr } = await supabaseAdmin
        .from("canchas")
        .select("id_cancha,nombre")
        .eq("id_cancha", reserva.id_cancha)
        .eq("id_club", reserva.id_club)
        .maybeSingle();

      if (!caErr && cancha?.nombre) canchaNombre = String(cancha.nombre);
    }

    // 2) Leer pago
    const { data: pago, error: pErr } = await supabaseAdmin
      .from("reservas_pagos")
      .select("*")
      .eq("id_pago", id_pago)
      .eq("id_reserva", id_reserva)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: `Error leyendo pago: ${pErr.message}` }, { status: 500 });
    }
    if (!pago) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    // Reutilizar preference si existe
    if (pago.mp_init_point || pago.mp_sandbox_init_point) {
      const redirectTo = pago.mp_sandbox_init_point || pago.mp_init_point;
      return NextResponse.redirect(String(redirectTo), { status: 302 });
    }

    // 3) Token del club
    const { token, modo } = await getClubMpAccessToken(reserva.id_club);
    const mpApiBase = "https://api.mercadopago.com";

    const amount = Number(pago.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido en reservas_pagos.amount" }, { status: 400 });
    }

    // 4) Datos para mostrar en “Detalles del pago”
    const fecha = safeStr((reserva as any).fecha, "");
    const inicio = hhmm((reserva as any).inicio);
    const fin = hhmm((reserva as any).fin);

    // 👉 Esto es lo que vas a ver en la UI de MP
    const itemTitle = `${clubNombre} · ${canchaNombre}`;
    const itemDescParts = [
      fecha ? `Fecha ${fecha}` : null,
      inicio && fin ? `Horario ${inicio}-${fin}` : null,
      `Reserva #${id_reserva}`,
      "Anticipo",
    ].filter(Boolean);
    const itemDescription = itemDescParts.join(" · ");

    const preferenceDescription = `${clubNombre} · ${canchaNombre} · Reserva #${id_reserva} · Anticipo`;
    const statement_descriptor = statementDescriptorFromClub(clubNombre);

    // 5) Crear preference
    const preferencePayload = {
      items: [
        {
          id: `reserva-${id_reserva}`,
          title: itemTitle,
          description: itemDescription,
          quantity: 1,
          unit_price: amount,
          currency_id: (pago.currency as string) || "ARS",
        },
      ],

      // Visible/semivisible
      description: preferenceDescription,
      statement_descriptor,

      // Técnica
      external_reference: String(id_reserva),

      notification_url: `${baseUrl}/api/pagos/mercadopago/webhook?id_club=${reserva.id_club}`,

      back_urls: {
        success: `${baseUrl}/pago/resultado?status=success&id_reserva=${id_reserva}&club=${encodeURIComponent(
          tenant
        )}`,
        pending: `${baseUrl}/pago/resultado?status=pending&id_reserva=${id_reserva}&club=${encodeURIComponent(
          tenant
        )}`,
        failure: `${baseUrl}/pago/resultado?status=failure&id_reserva=${id_reserva}&club=${encodeURIComponent(
          tenant
        )}`,
      },

      auto_return: "approved",

      // NO visible, pero clave para tu webhook y auditoría
      metadata: {
        id_reserva,
        id_pago,
        id_club: reserva.id_club,
        club_subdominio: tenant,
        club_nombre: clubNombre,
        id_cancha: reserva.id_cancha ?? null,
        cancha_nombre: canchaNombre,
        fecha: fecha || null,
        inicio: inicio || null,
        fin: fin || null,
        fin_dia_offset: (reserva as any).fin_dia_offset ?? null,
        tipo: "anticipo",
        modo,
      },
    };

    const mpRes = await fetch(`${mpApiBase}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpJson = await mpRes.json().catch(() => null);

    if (!mpRes.ok || !mpJson?.id) {
      return NextResponse.json(
        { error: "Error creando preference en Mercado Pago", detail: mpJson },
        { status: 502 }
      );
    }

    const mp_preference_id = String(mpJson.id);
    const init_point = mpJson.init_point ? String(mpJson.init_point) : null;
    const sandbox_init_point = mpJson.sandbox_init_point ? String(mpJson.sandbox_init_point) : null;

    // 6) Guardar
    const { error: upErr } = await supabaseAdmin
      .from("reservas_pagos")
      .update({
        mp_preference_id,
        mp_init_point: init_point,
        mp_sandbox_init_point: sandbox_init_point,
        status: "pending",
        last_event_at: new Date().toISOString(),
        raw: mpJson,
      })
      .eq("id_pago", id_pago);

    if (upErr) {
      return NextResponse.json({ error: `Error guardando preference: ${upErr.message}` }, { status: 500 });
    }

    // 7) Redirect
    const redirectUrl =
      (modo === "test" ? sandbox_init_point : init_point) || sandbox_init_point || init_point;

    if (!redirectUrl) {
      return NextResponse.json({ error: "Mercado Pago no devolvió init_point" }, { status: 502 });
    }

    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (e: any) {
    console.error("[GET /pago/iniciar] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
