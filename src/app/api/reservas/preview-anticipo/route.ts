import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COOKIE_NAME = "reserva_draft_v1";

// IDs reales
const PRIV_ROLE_IDS = new Set<number>([
  /* admin */ 1,
  /* staff */ 2,
  /* profe */ 4,
]);

type DraftSnapshot = {
  id_club: number;
  id_cancha: number;
  fecha: string; // YYYY-MM-DD (fecha efectiva del inicio)
  inicio: string; // HH:MM
  fin: string; // HH:MM (puede ser del día siguiente)
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

/**
 * club_usuarios permite múltiples roles.
 * Estrategia:
 * - Si existe un rol privilegiado (1/2/4), devolvemos ese (prioridad).
 * - Si no, devolvemos el primer rol que haya.
 */
async function getRoleInfoInClub(id_club: number, id_usuario: string): Promise<{
  id_rol: number | null;
  privilegiado: boolean;
  roles: number[];
}> {
  const { data, error } = await supabaseAdmin
    .from("club_usuarios")
    .select("id_rol")
    .eq("id_club", id_club)
    .eq("id_usuario", id_usuario);

  if (error) throw new Error(error.message);

  const roles = (data || [])
    .map((r: any) => Number(r?.id_rol))
    .filter((n: number) => Number.isFinite(n));

  if (roles.length === 0) return { id_rol: null, privilegiado: false, roles: [] };

  const priv = roles.find((r) => PRIV_ROLE_IDS.has(r)) ?? null;
  if (priv != null) return { id_rol: priv, privilegiado: true, roles };

  return { id_rol: roles[0] ?? null, privilegiado: false, roles };
}

export async function POST(req: Request) {
  try {
    const draft = readDraft(req);
    if (!draft) return NextResponse.json({ error: "No hay draft" }, { status: 400 });

    // Sesión
    const supabase = await getSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    if (uErr) return NextResponse.json({ error: "No se pudo validar la sesión" }, { status: 401 });

    const userId = userRes?.user?.id ?? null;
    if (!userId) return NextResponse.json({ error: "Tenés que iniciar sesión" }, { status: 401 });

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

    // Leer club con ambos anticipos
    const { data: club, error: cErr } = await supabaseAdmin
      .from("clubes")
      .select("id_club, anticipo_porcentaje, anticipo_porcentaje_privilegiados")
      .eq("id_club", draft.id_club)
      .maybeSingle();

    if (cErr) return NextResponse.json({ error: `Error leyendo club: ${cErr.message}` }, { status: 500 });
    if (!club) return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });

    // Rol (multi-fila ok)
    const roleInfo = await getRoleInfoInClub(draft.id_club, userId);

    const pctRaw = roleInfo.privilegiado
      ? (club.anticipo_porcentaje_privilegiados ?? club.anticipo_porcentaje ?? 50)
      : (club.anticipo_porcentaje ?? 50);

    const pct = Math.min(100, Math.max(0, Number(pctRaw)));
    const monto_anticipo = round2(precio_total * (pct / 100));

    return NextResponse.json({
      ok: true,
      precio_total,
      anticipo_porcentaje: pct,
      monto_anticipo,
      segmento: calcJson?.segmento ?? null,
      id_rol: roleInfo.id_rol,
      roles_en_club: roleInfo.roles,
      privilegiado: roleInfo.privilegiado,
    });
  } catch (e: any) {
    console.error("[POST /api/reservas/preview-anticipo] ex:", e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
