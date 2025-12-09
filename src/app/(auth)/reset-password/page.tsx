"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase/supabaseClient";

const ResetPasswordPage = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Estado para saber si la sesión inicial del link es válida
  const [isSessionValid, setIsSessionValid] = useState(true);

  // 1. Verificar al cargar si el link es válido Y activar el "Cerrojo"
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        // Si no hay sesión, el link murió.
        setIsSessionValid(false);
        setMessage("El enlace es inválido o ya fue utilizado. Solicitá uno nuevo.");
        
        // Importante: Si no hay sesión, limpiamos la marca por seguridad para no bloquear futuros logins normales
        localStorage.removeItem('recovery_pending');
      } else {
        // 🔥 NUEVO: Si la sesión es válida, marcamos al usuario localmente.
        // El RecoveryGuard leerá esto y bloqueará la navegación a otras páginas.
        localStorage.setItem('recovery_pending', 'true');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isSessionValid) {
      alert("No hay una sesión válida para cambiar la contraseña. Solicitá un correo nuevo.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // 2. Race Condition Fix (Tu solución para el zombie promise)
      const updatePasswordPromise = async () => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT_FORCE_SUCCESS")), 3000)
      );

      await Promise.race([updatePasswordPromise(), timeoutPromise]);

      // ---------------------------------------------------------
      // 3. ÉXITO: Liberar al usuario, cerrar sesión y redirigir
      // ---------------------------------------------------------
      
      // 🔥 NUEVO: Quitamos la marca para permitir la navegación futura
      localStorage.removeItem('recovery_pending');

      // Cerramos la sesión actual (recovery session)
      await supabase.auth.signOut();
      
      alert("Contraseña actualizada con éxito. Por favor, iniciá sesión nuevamente.");
      router.push("/login");

    } catch (err: any) {
      // Manejo del Timeout Forzado (éxito asumido)
      if (err.message === "TIMEOUT_FORCE_SUCCESS") {
        console.warn("Forzando éxito por timeout.");
        
        // 🔥 NUEVO: También liberamos aquí si fue timeout
        localStorage.removeItem('recovery_pending');
        
        await supabase.auth.signOut();
        alert("Contraseña actualizada. Iniciá sesión nuevamente.");
        router.push("/login");
        
      } else {
        // Errores reales
        console.error("[ResetPassword] error:", err);
        const msg = typeof err?.message === "string" &&
          (err.message.toLowerCase().includes("authsessionmissing") ||
           err.message.toLowerCase().includes("session"))
            ? "El enlace ya expiró. Por favor solicitá un correo nuevo."
            : "Ocurrió un error. Intentá nuevamente.";
        setMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Si la sesión no es válida desde el inicio, bloqueamos la UI visualmente
  if (!isSessionValid) {
     return (
        <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
            <div className="bg-[#0b2545] p-10 rounded-3xl text-center border border-red-900/50">
                <h2 className="text-xl text-red-400 font-bold mb-2">Enlace Expirado</h2>
                <p className="text-gray-300 mb-4">Este enlace de recuperación ya no es válido.</p>
                <button 
                  onClick={() => router.push("/login")}
                  className="bg-blue-600 px-4 py-2 rounded-xl text-sm"
                >
                  Volver al inicio
                </button>
            </div>
        </section>
     )
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-10 w-full max-w-md shadow-2xl text-center"
      >
        <Image
          src="/sponsors/versori/VERSORI_TRANSPARENTE.PNG"
          alt="Versori Logo"
          width={90}
          height={90}
          className="mx-auto mb-6 opacity-90"
        />

        <h1 className="text-3xl font-bold mb-2">Restablecer contraseña</h1>
        <p className="text-neutral-400 text-sm mb-4">
          Ingresá tu nueva contraseña para tu cuenta.
        </p>

        {message && (
          <p className="text-sm text-red-300 mb-4 text-left">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl font-semibold text-white disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            {isLoading ? "Actualizando..." : "Actualizar y Salir"}
          </button>
        </form>
      </motion.div>
    </section>
  );
};

export default ResetPasswordPage;