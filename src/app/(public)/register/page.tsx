"use client";

import { useState, useEffect, FormEvent, FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase/supabaseClient";
import { getSubdomainFromHost } from "@/lib/tenantUtils";
import { getClubBySubdomain } from "@/lib/getClubBySubdomain";

const RegisterPage: FC = () => {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [clubId, setClubId] = useState<number | null>(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    const fetchClub = async () => {
      const host = window.location.host;
      const hostname = host.split(":")[0];

      const sub = getSubdomainFromHost(hostname);
      setSubdomain(sub);

      if (sub) {
        const club = await getClubBySubdomain(sub);
        if (club) setClubId(club.id_club);
      }

      setClubLoading(false);
    };

    fetchClub();
  }, []);

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    if (!clubId || !subdomain) {
      alert("Error detectando el club.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // 0️⃣ Verificar si el usuario YA existe en la tabla profiles
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id_usuario")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("[Register] Error consultando profiles:", profileError);
      alert("Ocurrió un error al verificar el usuario.");
      setIsLoading(false);
      return;
    }

    // ===============================
    // CASO A: Usuario YA EXISTE
    // ===============================
    if (existingProfile) {
      // 1) Intentamos login con la contraseña ingresada
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError || !signInData?.user) {
        console.error("[Register] signIn error:", signInError);
        alert(
          "Este email ya está registrado en el sistema con otra contraseña. " +
            "Iniciá sesión con tu contraseña original o usá 'Olvidé mi contraseña'."
        );
        setIsLoading(false);
        return;
      }

      const userId = signInData.user.id;

      // 2) Usuario autenticado → agregamos membresía al club via API
      const response = await fetch("/api/memberships/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clubId, userId }),
      });

      const result = await response.json();
      console.log("[Register] Membership result:", result);

      if (!response.ok || !result.success) {
        // ❗ Falló crear la relación → limpiamos la sesión que acabamos de abrir
        await supabase.auth.signOut();

        alert("No se pudo asociar tu cuenta a este club.");
        console.error("[Register] Membership error:", result);
        setIsLoading(false);
        return;
      }

      // 3) OK: usuario ya existía y ahora pertenece a este club
      setMessage(
        "Ya tenías una cuenta en el sistema. Te agregamos a este club, ahora podés iniciar sesión."
      );
      setIsSubmitted(true);
      setIsLoading(false);
      return;
    }

    // ===============================
    // CASO B: Usuario NUEVO
    // ===============================

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      `${window.location.protocol}//${window.location.host}`;

    const redirectTo = `${siteUrl}/auth/callback?sub=${encodeURIComponent(
      subdomain
    )}`;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          apellido,
          telefono,
          id_club: clubId, // lo usa el trigger handle_new_auth_user
        },
        emailRedirectTo: redirectTo,
      },
    });

    if (signUpError) {
      console.error("[Register] signUp error:", signUpError);
      alert("Error al registrar: " + signUpError.message);
      setIsLoading(false);
      return;
    }

    setMessage(
      "Te enviamos un enlace de verificación. Revisá tu correo para activar tu cuenta."
    );
    setIsSubmitted(true);
    setIsLoading(false);
  };

  if (clubLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        Cargando...
      </section>
    );
  }

  if (isSubmitted) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-10 w-full max-w-md shadow-2xl text-center"
        >
          <h2 className="text-3xl font-bold mb-4">Registro procesado</h2>
          <p className="text-neutral-300">{message}</p>
          <p className="text-neutral-400 text-sm mt-6">
            Ya podés ir a{" "}
            <Link href="/login" className="text-blue-400 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </motion.div>
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
        <h1 className="text-3xl font-bold mb-2">Crear una cuenta</h1>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4 text-left">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-300 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-300 mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
                className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40"
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
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl"
          >
            {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>
        </form>

        <p className="text-gray-400 text-sm mt-6">
          ¿Ya tenés una cuenta?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </motion.div>
    </section>
  );
};

export default RegisterPage;
