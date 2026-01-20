import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const all = cookieStore.getAll().map((c) => c.name);

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    cookie_names: all,
    user: data?.user ? { id: data.user.id, email: data.user.email } : null,
    auth_error: error ? { message: error.message, status: (error as any).status } : null,
  });
}
