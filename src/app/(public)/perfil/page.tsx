import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import UserProfileForm from "../components/perfil/UserProfileForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const cookieStore = await cookies();

  // 1. INTENTO ESTÁNDAR
  let supabase = createServerComponentClient({
    cookies: () =>
      ({
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
        getAll() {
          return cookieStore
            .getAll()
            .map((c) => ({ name: c.name, value: c.value }));
        },
      }) as any,
  });

  let {
    data: { session },
  } = await supabase.auth.getSession();

  // 2. FALLBACK MANUAL
  if (!session) {
    try {
      const allCookies = cookieStore.getAll();
      const tokenCookies = allCookies.filter((c) =>
        c.name.includes("-auth-token"),
      );

      if (tokenCookies.length > 0) {
        tokenCookies.sort((a, b) => {
          const aIndex = parseInt(a.name.split(".").pop() || "0");
          const bIndex = parseInt(b.name.split(".").pop() || "0");
          return aIndex - bIndex;
        });

        let combinedValue = tokenCookies.map((c) => c.value).join("");
        if (combinedValue.startsWith("base64-")) {
          const base64Str = combinedValue.replace("base64-", "");
          combinedValue = Buffer.from(base64Str, "base64").toString("utf-8");
        }

        const sessionData = JSON.parse(combinedValue);

        if (sessionData.access_token) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
          const manualClient = createClient(supabaseUrl, supabaseKey);

          const { data: manualSession } = await manualClient.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
          });

          if (manualSession.session) {
            session = manualSession.session;
            supabase = manualClient as any;
          }
        }
      }
    } catch (err) {
      console.error("Error recuperación sesión:", err);
    }
  }

  if (!session) {
    redirect("/login");
  }

  // 4. Obtener datos
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id_usuario", session.user.id)
    .single();

  const nombreSaludo = profile?.nombre || "Jugador";

  return (
    // Fondo Negro Estética Versori
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 sm:px-6 font-sans selection:bg-white selection:text-black">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="border-b border-zinc-800 pb-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Hola, {nombreSaludo}.
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Gestiona tu información personal y datos de contacto.
          </p>
        </div>

        <UserProfileForm
          initialData={profile}
          email={session.user.email || ""}
          userId={session.user.id}
        />
      </div>
    </div>
  );
}
