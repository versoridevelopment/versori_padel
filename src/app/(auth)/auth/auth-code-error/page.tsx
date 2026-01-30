"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function AuthCodeErrorPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Recuperando sesión...");

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false, // lo parseamos a mano
        },
      }
    );
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        // ✅ leer next desde window (evita useSearchParams + Suspense)
        const url = new URL(window.location.href);
        const next = url.searchParams.get("next") || "/";

        // ✅ Parsear hash: #access_token=...&refresh_token=...&type=signup...
        const hash = window.location.hash?.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hp = new URLSearchParams(hash);

        const access_token = hp.get("access_token");
        const refresh_token = hp.get("refresh_token");

        if (!access_token || !refresh_token) {
          setMsg("No se pudo recuperar la sesión (faltan tokens).");
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error("[auth-code-error] setSession error:", error.message);
          setMsg("Error recuperando sesión: " + error.message);
          return;
        }

        // ✅ forzar refresh para que middleware/layout lean cookies
        router.refresh();
        router.replace(next);
      } catch (e: any) {
        console.error("[auth-code-error] exception:", e?.message);
        setMsg("Error inesperado recuperando sesión.");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Autenticación</h1>
        <p className="mt-2 text-sm opacity-80">{msg}</p>

        {msg !== "Recuperando sesión..." && (
          <div className="mt-4">
            <a className="underline" href="/login">
              Ir al login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
