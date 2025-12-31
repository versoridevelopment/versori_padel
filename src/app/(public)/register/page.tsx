"use client";

import { useState, useEffect, FormEvent, FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase/supabaseClient";

type MessageType = "success" | "error" | "info" | "warning" | null;

const formatName = (value: string) => {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const RegisterPage: FC = () => {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>(null);

  const [clubId, setClubId] = useState<number | null>(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  // NUEVO: Branding
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>("Club");

  useEffect(() => {
    const identifyClub = async () => {
      try {
        const hostname = window.location.hostname;
        let currentSubdomain: string | null = null;
        const parts = hostname.split(".");

        if (hostname.includes("localhost")) {
          if (parts.length > 1 && parts[0] !== "localhost") {
            currentSubdomain = parts[0];
          }
        } else {
          if (parts.length > 2) {
            currentSubdomain = parts[0];
          }
        }

        setSubdomain(currentSubdomain);

        if (currentSubdomain) {
          const { data, error } = await supabase
            .from("clubes")
            // ACTUALIZADO: Seleccionamos logo y nombre
            .select("id_club, logo_url, nombre")
            .eq("subdominio", currentSubdomain)
            .single();

          if (error) {
            console.error("Error buscando club:", error);
          } else if (data) {
            setClubId(data.id_club);
            setClubLogo(data.logo_url);
            setClubName(data.nombre);
          }
        }
      } catch (err) {
        console.error("Error en detección de club:", err);
      } finally {
        setClubLoading(false);
      }
    };

    identifyClub();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
    else if (nombre.trim().length < 2)
      newErrors.nombre = "Mínimo 2 caracteres.";

    if (!apellido.trim()) newErrors.apellido = "El apellido es obligatorio.";
    else if (apellido.trim().length < 2)
      newErrors.apellido = "Mínimo 2 caracteres.";

    const telClean = telefono.replace(/\D/g, "");
    if (!telClean) newErrors.telefono = "El teléfono es obligatorio.";
    else if (telClean.length < 6) newErrors.telefono = "Mínimo 6 dígitos.";

    if (!email.trim()) newErrors.email = "El email es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      newErrors.email = "Email inválido.";

    if (!password) newErrors.password = "La contraseña es obligatoria.";
    else if (password.length < 6) newErrors.password = "Mínimo 6 caracteres.";

    if (!confirmPassword) newErrors.confirmPassword = "Confirmar contraseña.";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "No coinciden.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setMessage("Revisá los campos marcados en rojo.");
      setMessageType("error");
      return false;
    }
    return true;
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setMessageType(null);
    setErrors({});

    const isValid = validateForm();
    if (!isValid) return;

    if (!clubId || !subdomain) {
      setMessage("No se pudo identificar el club. Recargá la página.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);

    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id_usuario")
      .eq("email", email.trim())
      .maybeSingle();

    if (profileError) {
      setMessage("Error de conexión. Intentá más tarde.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    if (existingProfile) {
      setMessage("Este email ya está registrado. Por favor iniciá sesión.");
      setMessageType("warning");
      setIsLoading(false);
      return;
    }

    const siteUrl = window.location.origin;
    const redirectTo = `${siteUrl}/auth/callback?sub=${encodeURIComponent(
      subdomain
    )}`;

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre: formatName(nombre),
          apellido: formatName(apellido),
          telefono,
          id_club: clubId,
        },
        emailRedirectTo: redirectTo,
      },
    });

    if (signUpError) {
      const msg = signUpError.message || "";
      if (msg.toLowerCase().includes("already registered")) {
        setMessage("Usuario ya registrado. Iniciá sesión.");
        setMessageType("warning");
      } else {
        setMessage("Error: " + signUpError.message);
        setMessageType("error");
      }
      setIsLoading(false);
      return;
    }

    setMessage("Te enviamos un enlace de verificación al correo.");
    setMessageType("success");
    setIsSubmitted(true);
    setIsLoading(false);
  };

  if (clubLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-[#001a33] text-white">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p>Cargando club...</p>
        </div>
      </section>
    );
  }

  // Logo a mostrar
  const logoSrc = clubLogo || "/sponsors/versori/VERSORI_TRANSPARENTE.PNG";
  const logoAlt = clubLogo ? `${clubName} Logo` : "Versori Logo";

  if (isSubmitted) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-10 w-full max-w-md shadow-2xl text-center"
        >
          <h2 className="text-3xl font-bold mb-4">¡Registro Exitoso!</h2>
          <div className="mb-4 text-sm p-3 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
            {message}
          </div>
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
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-8 w-full max-w-lg shadow-2xl text-center"
      >
        {/* IMAGEN DE LOGO DINÁMICA */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <Image
            src={logoSrc}
            alt={logoAlt}
            fill
            className="object-contain opacity-90"
            sizes="96px"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold mb-2">Crear Cuenta en {clubName}</h1>

        {message && (
          <div
            className={`mt-2 mb-4 text-sm p-3 rounded-xl text-left border flex items-start gap-3 ${
              messageType === "warning"
                ? "bg-amber-500/10 text-amber-200 border-amber-500/40"
                : messageType === "error"
                ? "bg-red-500/10 text-red-300 border-red-500/40"
                : "bg-blue-500/10 text-blue-200 border-blue-500/40"
            }`}
          >
            <span>{message}</span>
          </div>
        )}

        <form
          noValidate
          onSubmit={handleSignUp}
          className="flex flex-col gap-3 text-left"
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <label
                htmlFor="reg-nombre"
                className="text-xs text-gray-400 ml-1"
              >
                Nombre
              </label>
              <input
                id="reg-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={(e) => setNombre(formatName(e.target.value))}
                placeholder="Juan"
                className={`w-full p-2.5 rounded-lg bg-[#112d57] border ${
                  errors.nombre ? "border-red-500" : "border-blue-900/40"
                } focus:outline-none focus:border-blue-500`}
              />
              {errors.nombre && (
                <p className="text-xs text-red-400 mt-1">{errors.nombre}</p>
              )}
            </div>
            <div className="flex-1">
              <label
                htmlFor="reg-apellido"
                className="text-xs text-gray-400 ml-1"
              >
                Apellido
              </label>
              <input
                id="reg-apellido"
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                onBlur={(e) => setApellido(formatName(e.target.value))}
                placeholder="Pérez"
                className={`w-full p-2.5 rounded-lg bg-[#112d57] border ${
                  errors.apellido ? "border-red-500" : "border-blue-900/40"
                } focus:outline-none focus:border-blue-500`}
              />
              {errors.apellido && (
                <p className="text-xs text-red-400 mt-1">{errors.apellido}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-telefono"
              className="text-xs text-gray-400 ml-1"
            >
              Teléfono
            </label>
            <input
              id="reg-telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 3794..."
              className={`w-full p-2.5 rounded-lg bg-[#112d57] border ${
                errors.telefono ? "border-red-500" : "border-blue-900/40"
              } focus:outline-none focus:border-blue-500`}
            />
            {errors.telefono && (
              <p className="text-xs text-red-400 mt-1">{errors.telefono}</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-email" className="text-xs text-gray-400 ml-1">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@email.com"
              className={`w-full p-2.5 rounded-lg bg-[#112d57] border ${
                errors.email ? "border-red-500" : "border-blue-900/40"
              } focus:outline-none focus:border-blue-500`}
            />
            {errors.email && (
              <p className="text-xs text-red-400 mt-1">{errors.email}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label
                htmlFor="reg-password"
                className="text-xs text-gray-400 ml-1"
              >
                Contraseña
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className={`w-full p-2.5 rounded-lg bg-[#112d57] border ${
                  errors.password ? "border-red-500" : "border-blue-900/40"
                } focus:outline-none focus:border-blue-500`}
              />
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password}</p>
              )}
            </div>
            <div className="flex-1">
              <label
                htmlFor="reg-confirm"
                className="text-xs text-gray-400 ml-1"
              >
                Confirmar
              </label>
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="******"
                className={`w-full p-2.5 rounded-lg bg-[#112d57] border ${
                  errors.confirmPassword
                    ? "border-red-500"
                    : "border-blue-900/40"
                } focus:outline-none focus:border-blue-500`}
              />
            </div>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-400">{errors.confirmPassword}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Procesando..." : "Registrarse"}
          </button>
        </form>

        <p className="text-gray-400 text-sm mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Iniciá sesión
          </Link>
        </p>
      </motion.div>
    </section>
  );
};

export default RegisterPage;
