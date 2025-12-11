// src/app/login/page.tsx
"use client";

import { useState, useEffect, FormEvent, FC } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase/supabaseClient";
import { getSubdomainFromHost } from "@/lib/ObetenerClubUtils/tenantUtils";
import { getClubBySubdomain } from "@/lib/ObetenerClubUtils/getClubBySubdomain";

type MessageType = "success" | "error" | "info" | null;

const LoginPage: FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>(null);

  // Multi-tenant
  const [clubId, setClubId] = useState<number | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [clubLoading, setClubLoading] = useState<boolean>(true);

  // Detectar club por subdominio
  useEffect(() => {
    const fetchClub = async () => {
      try {
        const host = window.location.host; // ej: "padelcentral.localhost:3000"
        const hostname = host.split(":")[0]; // "padelcentral.localhost"
        const sub = getSubdomainFromHost(hostname);
        setSubdomain(sub);

        if (!sub) {
          console.error("[Login] No se pudo detectar subdominio desde host:", host);
          return;
        }

        const club = await getClubBySubdomain(sub);
        if (club) {
          setClubId(club.id_club);
        } else {
          console.error("[Login] No se encontró club para subdominio:", sub);
        }
      } finally {
        setClubLoading(false);
      }
    };

    fetchClub();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = "El email es obligatorio.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = "Ingresá un email válido.";
      }
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setMessage("Revisá los campos marcados en rojo.");
      setMessageType("error");
      return false;
    }

    return true;
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // limpiar mensajes previos
    setMessage(null);
    setMessageType(null);
    setErrors({});

    const isValid = validateForm();
    if (!isValid) return;

    if (!clubId) {
      setMessage("No se reconoce el club actual.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);

    // 1️⃣ Login con Supabase Auth
    const {
      data: loginData,
      error: loginError,
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError || !loginData?.user) {
      console.error("[Login] Error signInWithPassword:", loginError);
      setMessage("Usuario o contraseña incorrectos.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    const userId = loginData.user.id;

    // 2️⃣ Crear / asegurar membresía en club_usuarios via API
    try {
      const response = await fetch("/api/memberships/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clubId, userId }),
      });

      const result = await response.json();
      console.log("[Login] Membership result:", result);

      if (!response.ok || !result.success) {
        // Si no podemos asociar el usuario al club, cerramos la sesión
        await supabase.auth.signOut();
        setMessage(
          "No se pudo asociar tu cuenta a este club. Intentá nuevamente."
        );
        setMessageType("error");
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error("[Login] Error llamando a /api/memberships/add:", err);
      await supabase.auth.signOut();
      setMessage(
        "No se pudo asociar tu cuenta a este club. Intentá nuevamente."
      );
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    // 3️⃣ Login + membresía OK
    setIsLoading(false);
    router.push("/");
  };

  // --- LOGIN CON GOOGLE (se mantiene igual; la membresía se maneja en /auth/callback) ---
  const handleGoogleLogin = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback${
          subdomain ? `?sub=${encodeURIComponent(subdomain)}` : ""
        }`,
      },
    });

    if (error) {
      console.error("Error al iniciar sesión con Google:", error.message);
      setMessage("Hubo un problema al intentar iniciar sesión con Google.");
      setMessageType("error");
    }
  };

  // Loader mientras se resuelve el club
  if (clubLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
        <p>Cargando datos del club...</p>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6 pt-32 pb-12">
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
        <h1 className="text-3xl font-bold mb-2">Iniciar sesión</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Accedé con tus datos para continuar con tus reservas
        </p>

        {/* Mensajes inline */}
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

        <form
          noValidate
          onSubmit={handleLogin}
          className="flex flex-col gap-4 text-left"
        >
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="ejemplo@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.email ? "border-red-500" : "border-blue-900/40"
              } focus:outline-none focus:ring-2 focus:ring-blue-600`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.password ? "border-red-500" : "border-blue-900/40"
              } focus:outline-none focus:ring-2 focus:ring-blue-600`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl font-semibold disabled:bg-blue-800 disabled:opacity-60"
          >
            {isLoading ? "Iniciando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-gray-400 text-sm mt-6">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            Registrate
          </Link>
        </p>
        <p className="text-gray-400 text-sm mt-4">
          ¿Olvidaste tu contraseña?{" "}
          <Link href="/forgot-password" className="text-blue-400 hover:underline">
            Recuperarla
          </Link>
        </p>

        <div className="mt-8">
          <div className="flex items-center gap-2 justify-center text-gray-400 text-sm mb-4">
            <span className="w-10 h-px bg-gray-600"></span>o
            <span className="w-10 h-px bg-gray-600"></span>
          </div>

          {/* Botón Google */}
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 bg.white bg-white hover:bg-gray-100 text-gray-800 font-semibold px-6 py-3 rounded-xl shadow-md w-full transition-all"
          >
            <Image
              src="/google-icon.svg"
              alt="Google Icon"
              width={20}
              height={20}
            />
            Iniciar sesión con Google
          </button>
        </div>
      </motion.div>
    </section>
  );
};

export default LoginPage;
