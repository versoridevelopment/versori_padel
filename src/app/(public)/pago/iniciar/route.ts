import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getClubMpAccessToken } from "@/lib/mercadopago/getClubMpToken";

export const runtime = "nodejs";

function isExpired(expires_at: string) {
  const t = new Date(expires_at).getTime();
  return !Number.isFinite(t) || t <= Date.now();
}

function isLocalhost(u: string) {
  return (
    u.includes("localhost") ||
    u.includes("127.0.0.1") ||
    u.includes(".localhost")
  );
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

    // 1) Leer reserva
    const { data: reserva, error: rErr } = await supabaseAdmin
      .from("reservas")
      .select("id_reserva,id_club,estado,expires_at")
      .eq("id_reserva", id_reserva)
      .maybeSingle();

    if (rErr) {
      return NextResponse.json(
        { error: `Error leyendo reserva: ${rErr.message}` },
        { status: 500 }
      );
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

    // ✅ 1.1) Leer club.subdominio (para volver al tenant correcto)
    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, subdominio")
      .eq("id_club", reserva.id_club)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json(
        { error: `Error leyendo club: ${cErr.message}` },
        { status: 500 }
      );
    }
    if (!club?.subdominio) {
      return NextResponse.json(
        { error: "El club no tiene subdominio configurado" },
        { status: 500 }
      );
    }

    const tenant = String(club.subdominio);

    // 2) Leer pago
    const { data: pago, error: pErr } = await supabaseAdmin
      .from("reservas_pagos")
      .select("*")
      .eq("id_pago", id_pago)
      .eq("id_reserva", id_reserva)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json(
        { error: `Error leyendo pago: ${pErr.message}` },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: "Monto inválido en reservas_pagos.amount" },
        { status: 400 }
      );
    }

    // 4) Crear preference
    // ✅ IMPORTANTÍSIMO: back_urls + notification_url públicas
    // ✅ y “tenant-aware” con ?club=
    const preferencePayload = {
      items: [
        {
          title: `Reserva #${id_reserva} (anticipo)`,
          quantity: 1,
          unit_price: amount,
          currency_id: (pago.currency as string) || "ARS",
        },
      ],
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

      metadata: {
        id_reserva,
        id_pago,
        id_club: reserva.id_club,
        club: tenant,
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
    const sandbox_init_point = mpJson.sandbox_init_point
      ? String(mpJson.sandbox_init_point)
      : null;

    // 5) Guardar
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
      return NextResponse.json(
        { error: `Error guardando preference: ${upErr.message}` },
        { status: 500 }
      );
    }

    // 6) Redirect
    const redirectUrl =
      (modo === "test" ? sandbox_init_point : init_point) ||
      sandbox_init_point ||
      init_point;

    if (!redirectUrl) {
      return NextResponse.json(
        { error: "Mercado Pago no devolvió init_point" },
        { status: 502 }
      );
    }

    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (e: any) {
    console.error("[GET /pago/iniciar] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
