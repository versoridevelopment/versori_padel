// src/app/login/page.tsx
"use client";

import { useState, useEffect, FormEvent, FC } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase/supabaseClient";
import { getSubdomainFromHost } from "@/lib/tenantUtils";
import { getClubBySubdomain } from "@/lib/getClubBySubdomain";

const LoginPage: FC = () => {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Multi-tenant
  const [clubId, setClubId] = useState<number | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [clubLoading, setClubLoading] = useState<boolean>(true);

  // Detectar club por subdominio
  useEffect(() => {
    const fetchClub = async () => {
      try {
        const host = window.location.host;      // ej: "padelcentral.localhost:3000"
        const hostname = host.split(":")[0];    // "padelcentral.localhost"
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

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!clubId) {
      alert("No se reconoce el club actual.");
      return;
    }

    setIsLoading(true);

    // 1️⃣ Buscar usuario por email en profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id_usuario")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      setIsLoading(false);
      alert("Usuario o contraseña incorrectos");
      return;
    }

    const userId = profile.id_usuario;

    // 2️⃣ Verificar si pertenece a este club
    const { data: membership, error: membershipError } = await supabase
      .from("club_usuarios")
      .select("id_club")
      .eq("id_usuario", userId)
      .eq("id_club", clubId)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "[Login] Error verificando membresía en club_usuarios:",
        membershipError.message
      );
      setIsLoading(false);
      alert("Usuario o contraseña incorrectos");
      return;
    }

    if (!membership) {
      // No pertenece a este club → mismo mensaje genérico
      setIsLoading(false);
      alert("Usuario o contraseña incorrectos");
      return;
    }

    // 3️⃣ Pertenece al club → ahora sí hacemos login con password
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setIsLoading(false);
      alert("Usuario o contraseña incorrectos");
      return;
    }

    // 4️⃣ Login OK
    setIsLoading(false);
    router.push("/");
  };

  // --- LOGIN CON GOOGLE (manteniendo diseño) ---
  const handleGoogleLogin = async () => {
    // Usamos la URL central definida en .env (multi-tenant)
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
      alert("Hubo un problema al intentar iniciar sesión con Google.");
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

        <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="ejemplo@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl font-semibold disabled:bg-blue-800"
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

          {/* --- BOTÓN DE GOOGLE CONECTADO A LA FUNCIÓN --- */}
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
