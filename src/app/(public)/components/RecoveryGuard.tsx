"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabase/supabaseClient"; // Ajusta la ruta si es necesario

const RecoveryGuard = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Escuchamos cambios de sesión
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        
        // 1. Si no hay sesión, nos aseguramos de limpiar la marca para no bloquear futuros logins
        if (!session) {
          localStorage.removeItem('recovery_pending');
          return;
        }

        // 2. Leemos nuestra marca manual
        const isRecoveryPending = localStorage.getItem('recovery_pending') === 'true';

        // DEBUG
        if (isRecoveryPending) {
            console.log("🔒 GUARD: Usuario marcado en MODO RECUPERACIÓN");
        }

        // 3. LOGICA DE BLOQUEO FINAL
        // Si tiene la marca 'recovery_pending' Y NO está en la página de reset...
        if (isRecoveryPending && !pathname.startsWith('/reset-password')) {
            console.warn("🚫 GUARD: Bloqueado por marca local. Redirigiendo...");
            router.replace('/reset-password');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
};

export default RecoveryGuard;