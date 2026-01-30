// app/api/auth/resend-signup/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email: string;
  redirectTo?: string;
};

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function findUserByEmail(email: string) {
  // Fallback compatible: listUsers() + filter
  // (Paginar por si hay muchos users)
  const PER_PAGE = 200; // podés subirlo si querés
  const MAX_PAGES = 20; // evita loops infinitos

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });

    if (error) throw error;

    const user = data?.users?.find(
      (u) => (u.email || "").toLowerCase() === email.toLowerCase()
    );

    if (user) return user;

    // si vino menos que PER_PAGE, no hay más páginas
    if (!data?.users || data.users.length < PER_PAGE) break;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    const redirectTo = (body.redirectTo || "").trim();

    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "EMAIL_INVALIDO" },
        { status: 400 }
      );
    }

    // 1) Buscar usuario por email (ADMIN)
    let user: any = null;
    try {
      user = await findUserByEmail(email);
    } catch (e) {
      console.error("[resend-signup] admin listUsers error:", e);
      return NextResponse.json(
        { ok: false, error: "ADMIN_LOOKUP_ERROR" },
        { status: 500 }
      );
    }

    // Seguridad: si no existe, devolvemos OK genérico (no filtramos existencia)
    if (!user) {
      return NextResponse.json({ ok: true, status: "NOT_FOUND" });
    }

    const confirmedAt =
      user.email_confirmed_at ?? user.confirmed_at ?? user.email_confirmed_at ?? null;

    // 2) Si ya está confirmado => NO reenviar
    if (confirmedAt) {
      return NextResponse.json({ ok: true, status: "CONFIRMED" });
    }

    // 3) No confirmado => reenviar
    // Usamos un cliente "public" server-side
    const supabasePublic = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: resendError } = await supabasePublic.auth.resend({
      type: "signup",
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });

    if (resendError) {
      console.error("[resend-signup] resend error:", resendError);
      return NextResponse.json(
        { ok: false, error: resendError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, status: "RESENT" });
  } catch (e) {
    console.error("[resend-signup] unexpected:", e);
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED" },
      { status: 500 }
    );
  }
}
