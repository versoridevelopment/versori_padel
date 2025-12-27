import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

const COOKIE_NAME = "reserva_draft_v1";

type DraftSnapshot = {
  id_club: number;
  id_cancha: number;
  fecha: string;  // YYYY-MM-DD (fecha efectiva del inicio)
  inicio: string; // HH:MM
  fin: string;    // HH:MM (puede ser del día siguiente)
};

function base64Decode<T = any>(s: string): T | null {
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function readDraft(req: Request): DraftSnapshot | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(COOKIE_NAME + "="));
  if (!match) return null;
  const val = match.slice((COOKIE_NAME + "=").length);
  return base64Decode<DraftSnapshot>(val);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const draft = readDraft(req);
    if (!draft) return NextResponse.json({ error: "No hay draft" }, { status: 400 });

    // Recalcular precio server-side
    const calcRes = await fetch(new URL("/api/reservas/calcular-precio", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        id_club: draft.id_club,
        id_cancha: draft.id_cancha,
        fecha: draft.fecha,
        inicio: draft.inicio,
        fin: draft.fin,
      }),
      cache: "no-store",
    });

    const calcJson = await calcRes.json().catch(() => null);
    if (!calcRes.ok) {
      return NextResponse.json(
        { error: calcJson?.error || "No se pudo calcular el precio", detail: calcJson },
        { status: calcRes.status }
      );
    }

    const precio_total = Number(calcJson?.precio_total || 0);
    if (!Number.isFinite(precio_total) || precio_total <= 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }

    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, anticipo_porcentaje")
      .eq("id_club", draft.id_club)
      .maybeSingle();

    if (cErr) return NextResponse.json({ error: `Error leyendo club: ${cErr.message}` }, { status: 500 });
    if (!club) return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });

    const pct = Math.min(100, Math.max(0, Number(club.anticipo_porcentaje ?? 50)));
    const monto_anticipo = round2(precio_total * (pct / 100));

    return NextResponse.json({
      ok: true,
      precio_total,
      anticipo_porcentaje: pct,
      monto_anticipo,
      segmento: calcJson?.segmento ?? null,
    });
  } catch (e: any) {
    console.error("[POST /api/reservas/preview-anticipo] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
