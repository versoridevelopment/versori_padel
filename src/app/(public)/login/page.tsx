"use client";

import { useState, useEffect, FormEvent, FC } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // Agregado useSearchParams
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { createBrowserClient } from "@supabase/ssr"; // 👈 IMPORTANTE
import { getSubdomainFromHost } from "@/lib/ObetenerClubUtils/tenantUtils";
import { getClubBySubdomain } from "@/lib/ObetenerClubUtils/getClubBySubdomain";
import { Loader2 } from "lucide-react";

type MessageType = "success" | "error" | "info" | null;

const LoginPage: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/"; // Redirección inteligente

  // Instancia de Supabase para el cliente
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>(null);

  // Multi-tenant
  const [clubId, setClubId] = useState<number | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [clubLoading, setClubLoading] = useState<boolean>(true);

  // Detectar club por subdominio
  useEffect(() => {
    const fetchClub = async () => {
      try {
        const host = window.location.host;
        const hostname = host.split(":")[0];
        const sub = getSubdomainFromHost(hostname);
        setSubdomain(sub);

        if (!sub) {
          console.error("[Login] No se pudo detectar subdominio");
          // Opcional: setMessage("Estás en el dominio principal.");
          return;
        }

        const club = await getClubBySubdomain(sub);
        if (club) {
          setClubId(club.id_club);
          setClubLogo(club.logo_url);
        } else {
          setMessage("Club no encontrado para este subdominio.");
          setMessageType("error");
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

    setMessage(null);
    setMessageType(null);
    setErrors({});

    if (!validateForm()) return;

    if (!clubId) {
      // Si no hay clubId, quizás es un login genérico o error de carga
      // setMessage("No se reconoce el club actual.");
      // setMessageType("error");
      // return;
    }

    setIsLoading(true);

    try {
      // 1. Login Directo con Supabase (Establece cookie en navegador)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("No se pudo obtener el usuario.");
      }

      // 2. Asociar al Club (Lógica de negocio existente)
      if (clubId) {
        try {
          await fetch("/api/memberships/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clubId, userId: data.user.id }),
          });
        } catch (memErr) {
          console.warn(
            "Error asociando membresía, continuando login...",
            memErr,
          );
          // No bloqueamos el login si falla esto, pero logueamos
        }
      }

      // 3. ACTUALIZAR ROUTER Y REDIRIGIR
      // router.refresh() es CRUCIAL para que el middleware/navbar vean la nueva cookie
      router.refresh();
      router.push(next);
    } catch (err: any) {
      console.error("[Login] Error:", err.message);
      setMessage("Usuario o contraseña incorrectos.");
      setMessageType("error");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    // Usamos la instancia local, no import dinámico
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Redirige al callback que arreglamos antes
        redirectTo: `${siteUrl}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Error Google Login:", error.message);
      setMessage("Error al iniciar con Google.");
      setMessageType("error");
    }
  };

  if (clubLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
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
        {/* LOGO DINÁMICO */}
        {clubLogo ? (
          <div className="relative w-24 h-24 mx-auto mb-6">
            <Image
              src={clubLogo}
              alt="Logo del Club"
              fill
              className="object-contain"
              priority
            />
          </div>
        ) : (
          <div className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center font-bold text-2xl">
            C
          </div>
        )}

        <h1 className="text-3xl font-bold mb-2">Iniciar sesión</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Accedé con tus datos para continuar con tus reservas
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

        <form
          noValidate
          onSubmit={handleLogin}
          className="flex flex-col gap-4 text-left"
        >
          <div>
            <label htmlFor="email" className="block text-sm text-gray-300 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
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
            <label
              htmlFor="password"
              className="block text-sm text-gray-300 mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
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
            className="mt-4 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl font-semibold disabled:bg-blue-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
          <Link
            href="/forgot-password"
            className="text-blue-400 hover:underline"
          >
            Recuperarla
          </Link>
        </p>

        {/*   BOTON DE GOOGLE FUERA DE SERVICIO POR EL MOMENTO
        <div className="mt-8">
          <div className="flex items-center gap-2 justify-center text-gray-400 text-sm mb-4">
            <span className="w-10 h-px bg-gray-600"></span>o
            <span className="w-10 h-px bg-gray-600"></span>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold px-6 py-3 rounded-xl shadow-md w-full transition-all"
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

            */}
      </motion.div>
    </section>
  );
};

export default LoginPage;
