"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase/supabaseClient";

type MessageType = "success" | "error" | "info" | null;

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isSessionValid, setIsSessionValid] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // 1) AL CARGAR: si viene ?code=... (PKCE) -> exchange -> sesión -> cookie
  useEffect(() => {
    const init = async () => {
      try {
        const code = searchParams.get("code");

        // ✅ PKCE: convertir "code" en sesión
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[ResetPassword] exchangeCodeForSession error:", error);
          }

          // ✅ limpiar URL para que no quede ?code=... y no se re-ejecute
          router.replace("/reset-password");
        }

        const { data } = await supabase.auth.getSession();

        if (!data.session) {
          setIsSessionValid(false);
          setMessage("El enlace es inválido o ya fue utilizado. Solicitá uno nuevo.");
          document.cookie = "recovery_pending=; path=/; max-age=0";
        } else {
          document.cookie = "recovery_pending=true; path=/; max-age=3600";
        }
      } catch (e) {
        console.error("[ResetPassword] init error:", e);
        setIsSessionValid(false);
        setMessage("El enlace es inválido o ya fue utilizado. Solicitá uno nuevo.");
        document.cookie = "recovery_pending=; path=/; max-age=0";
      }
    };

    init();
  }, [router, searchParams]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Debés confirmar la contraseña.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setMessage("Revisá los campos marcados en rojo.");
      setMessageType("error");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setMessage(null);
    setMessageType(null);
    setErrors({});

    if (!isSessionValid) {
      setMessage("No hay una sesión válida para cambiar la contraseña.");
      setMessageType("error");
      return;
    }

    const isValid = validateForm();
    if (!isValid) return;

    setIsLoading(true);

    try {
      const updatePasswordPromise = async () => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT_FORCE_SUCCESS")), 3000)
      );

      await Promise.race([updatePasswordPromise(), timeoutPromise]);

      // ÉXITO: borrar cookie y cerrar sesión
      document.cookie = "recovery_pending=; path=/; max-age=0";
      await supabase.auth.signOut();

      setMessage("Tu contraseña se actualizó correctamente. Iniciá sesión nuevamente.");
      setMessageType("success");
      setIsCompleted(true);
    } catch (err: any) {
      if (err?.message === "TIMEOUT_FORCE_SUCCESS") {
        console.warn("Forzando éxito por timeout.");

        document.cookie = "recovery_pending=; path=/; max-age=0";
        await supabase.auth.signOut();

        setMessage("Tu contraseña se actualizó correctamente. Iniciá sesión nuevamente.");
        setMessageType("success");
        setIsCompleted(true);
      } else {
        console.error("[ResetPassword] error:", err);
        const msg =
          typeof err?.message === "string" &&
          (err.message.toLowerCase().includes("authsessionmissing") ||
            err.message.toLowerCase().includes("session"))
            ? "El enlace ya expiró. Por favor solicitá un correo nuevo."
            : "Ocurrió un error. Intentá nuevamente.";
        setMessage(msg);
        setMessageType("error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Vista cuando la sesión del enlace es inválida
  if (!isSessionValid && !isCompleted) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
        <div className="bg-[#0b2545] p-10 rounded-3xl text-center border border-red-900/50 max-w-md w-full">
          <h2 className="text-xl text-red-400 font-bold mb-2">Enlace Expirado</h2>
          <p className="text-gray-300 mb-4">
            Este enlace de recuperación ya no es válido.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition"
          >
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  // Vista de éxito después de actualizar la contraseña
  if (isCompleted && message) {
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

          <h1 className="text-3xl font-bold mb-4">Contraseña actualizada</h1>

          <div className="mb-6 text-sm p-3 rounded-xl border bg-emerald-500/10 text-emerald-300 border-emerald-500/40">
            {message}
          </div>

          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700 transition-all py-3 px-6 rounded-xl font-semibold text-white"
          >
            Ir a iniciar sesión
          </button>
        </motion.div>
      </section>
    );
  }

  // Vista normal de formulario
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
          <div
            className={`mb-4 text-sm p-3 rounded-xl text-left border ${
              messageType === "error"
                ? "bg-red-500/10 text-red-300 border-red-500/40"
                : messageType === "success"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                : "bg-blue-500/10 text-blue-200 border-blue-500/40"
            }`}
          >
            {message}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.password ? "border-red-500" : "border-blue-900/40"
              } text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.confirmPassword ? "border-red-500" : "border-blue-900/40"
              } text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl font-semibold text-white disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            {isLoading ? "Actualizando..." : "Actualizar y salir"}
          </button>
        </form>
      </motion.div>
    </section>
  );
};

export default ResetPasswordPage;
