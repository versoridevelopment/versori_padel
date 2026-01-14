"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase/supabaseClient";
import { getSubdomainFromHost } from "@/lib/ObetenerClubUtils/tenantUtils";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    const host = window.location.host; // ej: "greenpadel.localhost:3000"
    const hostname = host.split(":")[0]; // "greenpadel.localhost"
    const sub = getSubdomainFromHost(hostname);
    setSubdomain(sub);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Dominio "central" sin subdominio
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Vamos a un callback central que luego redirige al subdominio
    const redirectTo = `${siteUrl}/password-callback${
      subdomain ? `?sub=${encodeURIComponent(subdomain)}` : ""
    }`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("[ForgotPassword] error:", error);
      setMessage("Ocurrió un error al enviar el correo. Intentá nuevamente.");
      setIsLoading(false);
      return;
    }

    setMessage(
      "Si el correo existe en el sistema, te enviamos un enlace para restablecer tu contraseña."
    );
    setIsSubmitted(true);
    setIsLoading(false);
  };

  if (isSubmitted) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-10 w-full max-w-md shadow-2xl text-center"
        >
          <h2 className="text-3xl font-bold mb-4">
            Revisá tu correo electrónico
          </h2>
          <p className="text-neutral-300">{message}</p>
          <p className="text-neutral-400 text-sm mt-6">
            Volver a{" "}
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

        <h1 className="text-3xl font-bold mb-2">Recuperar contraseña</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Ingresá tu correo y te enviaremos un enlace para restablecer tu
          contraseña.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-[#112d57] border border-blue-900/40 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="ejemplo@gmail.com"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl font-semibold text-white disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            {isLoading ? "Enviando correo..." : "Enviar enlace de recuperación"}
          </button>
        </form>

        <p className="text-gray-400 text-sm mt-6">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </motion.div>
    </section>
  );
};

export default ForgotPasswordPage;