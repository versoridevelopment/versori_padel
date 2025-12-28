import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

const COOKIE_NAME = "reserva_draft_v1";

type DraftSnapshot = {
  id_club: number;
  id_cancha: number;
};

function base64Decode<T = any>(s: string): T | null {
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function readDraftFromCookie(req: Request): DraftSnapshot | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(COOKIE_NAME + "="));

  if (!match) return null;

  const val = match.slice((COOKIE_NAME + "=").length);
  const draft = base64Decode<any>(val);

  const id_club = Number(draft?.id_club);
  const id_cancha = Number(draft?.id_cancha);

  if (!id_club || Number.isNaN(id_club)) return null;
  if (!id_cancha || Number.isNaN(id_cancha)) return null;

  return { id_club, id_cancha };
}

export async function GET(req: Request) {
  try {
    const draft = readDraftFromCookie(req);
    if (!draft) {
      return NextResponse.json({ club_nombre: null, cancha_nombre: null });
    }

    // 1) Club
    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, nombre")
      .eq("id_club", draft.id_club)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json({ error: `Error leyendo club: ${cErr.message}` }, { status: 500 });
    }

    // 2) Cancha (validamos que sea del club del draft)
    const { data: cancha, error: caErr } = await supabaseAdmin
      .from("canchas")
      .select("id_cancha, id_club, nombre")
      .eq("id_cancha", draft.id_cancha)
      .eq("id_club", draft.id_club)
      .maybeSingle();

    if (caErr) {
      return NextResponse.json({ error: `Error leyendo cancha: ${caErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      club_nombre: club?.nombre ?? null,
      cancha_nombre: cancha?.nombre ?? null,
    });
  } catch (e: any) {
    console.error("[GET /api/reservas/contexto] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
