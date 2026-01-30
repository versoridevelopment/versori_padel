"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Confirmando...");

  useEffect(() => {
    const run = async () => {
      try {
        // implicit: debería quedar sesión por hash automáticamente
        const { data, error } = await supabaseBrowser.auth.getSession();

        if (error) {
          setMsg("Error confirmando: " + error.message);
          return;
        }

        if (!data.session) {
          setMsg("Email verificado ✅. Ahora iniciá sesión.");
          return;
        }

        const url = new URL(window.location.href);
        const next = url.searchParams.get("next") || "/";

        router.replace(next);
      } catch (e: any) {
        setMsg("Email verificado ✅. Ahora iniciá sesión.");
      }
    };

    run();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Autenticación</h1>
        <p className="mt-2 text-sm opacity-80">{msg}</p>

        {msg !== "Confirmando..." && (
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
