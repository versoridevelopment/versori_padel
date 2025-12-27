// src/app/api/reservas/draft/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COOKIE_NAME = "reserva_draft_v1";
const MAX_AGE_SECONDS = 60 * 30; // 30 minutos

type DraftInput = {
  id_club: number;
  id_cancha: number;
  fecha: string;
  inicio: string;
  fin: string;
  // segmento?: "publico" | "profe"; // ignorado (server decide)
};

function base64Encode(obj: any) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function base64Decode<T = any>(s: string): T | null {
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(COOKIE_NAME + "="));

  if (!match) return NextResponse.json({ draft: null });

  const val = match.slice((COOKIE_NAME + "=").length);
  const draft = base64Decode(val);
  return NextResponse.json({ draft: draft ?? null });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as DraftInput | null;

  const id_club = Number(body?.id_club);
  const id_cancha = Number(body?.id_cancha);
  const fecha = String(body?.fecha || "");
  const inicio = String(body?.inicio || "");
  const fin = String(body?.fin || "");

  if (!id_club || Number.isNaN(id_club)) {
    return NextResponse.json({ error: "id_club es requerido y numérico" }, { status: 400 });
  }
  if (!id_cancha || Number.isNaN(id_cancha)) {
    return NextResponse.json({ error: "id_cancha es requerido y numérico" }, { status: 400 });
  }

  // ✅ Recalculamos server-side para “congelar” snapshot (anti-manipulación)
  // ✅ Reenviamos cookies para que calcular-precio detecte el usuario logueado
  const calcRes = await fetch(new URL("/api/reservas/calcular-precio", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify({ id_club, id_cancha, fecha, inicio, fin }),
    cache: "no-store",
  });

  const calcJson = await calcRes.json().catch(() => null);

  if (!calcRes.ok) {
    return NextResponse.json(
      { error: calcJson?.error || "No se pudo calcular precio", detail: calcJson },
      { status: calcRes.status }
    );
  }

  const snapshot = {
    id_club,
    id_cancha,
    user_id: calcJson?.user_id ?? null,
    segmento: calcJson?.segmento ?? "publico",
    fecha,
    inicio,
    fin,
    duracion_min: calcJson?.duracion_min,
    id_tarifario: calcJson?.id_tarifario,
    id_regla: calcJson?.id_regla,
    precio_total: calcJson?.precio_total,
    created_at: new Date().toISOString(),
  };

  const res = NextResponse.json({ ok: true, draft: snapshot });

  res.cookies.set(COOKIE_NAME, base64Encode(snapshot), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return res;
}
