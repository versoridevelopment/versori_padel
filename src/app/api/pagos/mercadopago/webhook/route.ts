import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getClubMpAccessToken } from "@/lib/mercadopago/getClubMpToken";

export const runtime = "nodejs";

function jsonOk() {
  return NextResponse.json({ ok: true });
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseReservaFromExternalRef(external_reference: any) {
  const s = String(external_reference || "");
  const first = s.split(":")[0];
  return num(first);
}

// ✅ NUEVO: leer id_pago desde metadata (tu preference ya lo manda)
function parsePagoFromMetadata(mpJson: any) {
  // Puede venir como number o string
  return num(mpJson?.metadata?.id_pago);
}

// ✅ (Opcional) si querés también atarlo por preference_id cuando exista
function parsePreferenceId(mpJson: any) {
  return mpJson?.preference_id ? String(mpJson.preference_id) : null;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const topicQ = sp.get("topic") || sp.get("type");
    const idQ = sp.get("id");

    const body = await req.json().catch(() => null);
    const topicB = body?.type || body?.topic;
    const idB = body?.data?.id;

    const finalTopic = topicQ || topicB;
    const mp_payment_id = num(idQ || idB);

    if (finalTopic !== "payment" || !mp_payment_id) return jsonOk();

    // 0) Idempotencia por mp_payment_id
    const { data: already, error: aErr } = await supabaseAdmin
      .from("reservas_pagos")
      .select("id_pago")
      .eq("mp_payment_id", mp_payment_id)
      .maybeSingle();

    if (aErr) {
      console.error("[MP webhook] idempotencia error:", aErr);
      return jsonOk();
    }
    if (already?.id_pago) return jsonOk();

    // 1) id_club debe venir en notification_url
    const id_club = num(sp.get("id_club"));
    if (!id_club) {
      console.error("[MP webhook] Falta id_club en query (notification_url).");
      return jsonOk();
    }

    const { token } = await getClubMpAccessToken(id_club);

    // 2) Consultar payment real
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${mp_payment_id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const mpJson = await mpRes.json().catch(() => null);

    if (!mpRes.ok || !mpJson) {
      console.error("[MP webhook] Error consultando payment:", mpJson);
      return jsonOk();
    }

    const id_reserva = parseReservaFromExternalRef(mpJson.external_reference);
    if (!id_reserva) {
      console.error(
        "[MP webhook] external_reference inválido:",
        mpJson.external_reference
      );
      return jsonOk();
    }

    const payment_status: string = mpJson.status;
    const payment_status_detail: string = mpJson.status_detail;
    const transaction_amount = Number(mpJson.transaction_amount || 0);

    // ==========================================================
    // ✅ 3) BUSCAR PAGO DB EXACTO usando metadata.id_pago (si viene)
    // ==========================================================
    const id_pago_meta = parsePagoFromMetadata(mpJson);
    const mp_preference_id = parsePreferenceId(mpJson); // opcional para log/fallback

    let pago: any = null;

    if (id_pago_meta) {
      const { data: pagoExacto, error: peErr } = await supabaseAdmin
        .from("reservas_pagos")
        .select("*")
        .eq("id_pago", id_pago_meta)
        .eq("id_club", id_club) // asegura tenant
        .eq("id_reserva", id_reserva) // asegura que corresponde a esa reserva
        .in("status", ["created", "pending"])
        .maybeSingle();

      if (peErr) {
        console.error(
          "[MP webhook] error buscando pago por metadata.id_pago:",
          { peErr, id_pago_meta }
        );
        return jsonOk();
      }

      if (!pagoExacto) {
        console.error("[MP webhook] metadata.id_pago no matchea un pago activo", {
          id_pago_meta,
          id_reserva,
          id_club,
          mp_preference_id,
        });
        return jsonOk();
      }

      pago = pagoExacto;
    } else {
      // 🔁 Fallback: tu comportamiento actual (por compatibilidad)
      let q = supabaseAdmin
        .from("reservas_pagos")
        .select("*")
        .eq("id_reserva", id_reserva)
        .in("status", ["created", "pending"])
        .order("created_at", { ascending: false })
        .limit(1);

      q = q.eq("id_club", id_club);

      const { data: pagoFallback, error: pagoErr } = await q.maybeSingle();

      if (pagoErr || !pagoFallback) {
        console.error("[MP webhook] pago db no encontrado para reserva:", {
          id_reserva,
          id_club,
          pagoErr,
          mp_preference_id,
        });
        return jsonOk();
      }

      pago = pagoFallback;
    }

    // 4) Validar monto con tolerancia
    const amountDb = Number(pago.amount || 0);
    const diff = Math.abs(amountDb - transaction_amount);

    if (!Number.isFinite(amountDb) || amountDb <= 0 || diff > 0.01) {
      console.error("[MP webhook] Monto no coincide", {
        amountDb,
        transaction_amount,
        diff,
      });
      return jsonOk();
    }

    // ✅ CAMBIO ÚNICO: guardar order.id como mp_merchant_order_id (int8)
    const mp_order_id = mpJson?.order?.id ? Number(mpJson.order.id) : null;

    // 5) Update reservas_pagos
    const { error: upErr } = await supabaseAdmin
      .from("reservas_pagos")
      .update({
        mp_payment_id,
        mp_merchant_order_id: mp_order_id, // ✅ único agregado
        mp_status: payment_status,
        mp_status_detail: payment_status_detail,
        status: payment_status === "approved" ? "approved" : payment_status,
        last_event_at: new Date().toISOString(),
        raw: mpJson,
      })
      .eq("id_pago", pago.id_pago);

    if (upErr) {
      console.error("[MP webhook] Error update reservas_pagos:", upErr);
      return jsonOk();
    }

    // 6) Transición reserva
    if (payment_status === "approved") {
      await supabaseAdmin
        .from("reservas")
        .update({ estado: "confirmada", confirmed_at: new Date().toISOString() })
        .eq("id_reserva", id_reserva)
        .eq("estado", "pendiente_pago");
    } else if (payment_status === "rejected" || payment_status === "cancelled") {
      await supabaseAdmin
        .from("reservas")
        .update({ estado: "rechazada" })
        .eq("id_reserva", id_reserva)
        .eq("estado", "pendiente_pago");
    }

    return jsonOk();
  } catch (e: any) {
    console.error("[MP webhook] ex:", e);
    return jsonOk();
  }
}
