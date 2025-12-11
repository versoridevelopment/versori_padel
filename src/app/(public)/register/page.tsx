"use client";

import { useState, useEffect, FormEvent, FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase/supabaseClient";
import { getSubdomainFromHost } from "@/lib/ObetenerClubUtils/tenantUtils";
import { getClubBySubdomain } from "@/lib/ObetenerClubUtils/getClubBySubdomain";

type MessageType = "success" | "error" | "info" | "warning" | null;

// Helper para capitalizar nombres y apellidos
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Nombre
    if (!nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio.";
    } else if (nombre.trim().length < 2) {
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres.";
    }

    // Apellido
    if (!apellido.trim()) {
      newErrors.apellido = "El apellido es obligatorio.";
    } else if (apellido.trim().length < 2) {
      newErrors.apellido = "El apellido debe tener al menos 2 caracteres.";
    }

    // Teléfono
    const telClean = telefono.replace(/\D/g, "");
    if (!telClean) {
      newErrors.telefono = "El teléfono es obligatorio.";
    } else if (telClean.length < 6) {
      newErrors.telefono = "El teléfono debe tener al menos 6 dígitos.";
    }

    // Email
    if (!email.trim()) {
      newErrors.email = "El email es obligatorio.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = "Ingresá un email válido.";
      }
    }

    // Password
    if (!password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    // Confirmación de password
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

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();

    // limpiar mensajes previos
    setMessage(null);
    setMessageType(null);
    setErrors({});

    // Validaciones de campos (ningún campo en blanco)
    const isValid = validateForm();
    if (!isValid) return;

    if (!clubId || !subdomain) {
      setMessage("Error detectando el club. Intentá recargar la página.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);

    // 0️⃣ Verificar si el usuario YA existe en la tabla profiles
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id_usuario")
      .eq("email", email.trim())
      .maybeSingle();

    if (profileError) {
      console.error("[Register] Error consultando profiles:", profileError);
      setMessage(
        "Ocurrió un error al verificar el usuario. Intentá de nuevo más tarde."
      );
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    // CASO: Email YA EXISTE en profiles
    if (existingProfile) {
      setMessage(
        "Atención: este email ya está registrado en el sistema VERSORI. Ya te has registrado en otro club. Iniciá sesión con tu contraseña original o usá 'Olvidé mi contraseña'."
      );
      setMessageType("warning");
      setIsLoading(false);
      return;
    }

    // CASO: Usuario NUEVO
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      `${window.location.protocol}//${window.location.host}`;

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
          id_club: clubId, // lo usa el trigger handle_new_auth_user
        },
        emailRedirectTo: redirectTo,
      },
    });

    if (signUpError) {
      console.error("[Register] signUp error:", signUpError);

      const msg = signUpError.message || "";
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already exists")
      ) {
        setMessage(
          "Atención: este email ya está registrado en el sistema VERSORI con otra contraseña. Iniciá sesión con tu contraseña original o usá 'Olvidé mi contraseña'."
        );
        setMessageType("warning");
      } else {
        setMessage("Error al registrar: " + signUpError.message);
        setMessageType("error");
      }

      setIsLoading(false);
      return;
    }

    setMessage(
      "Te enviamos un enlace de verificación. Revisá tu correo para activar tu cuenta."
    );
    setMessageType("success");
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

          {message && (
            <div
              className={`mb-4 text-sm p-3 rounded-xl border ${
                messageType === "error"
                  ? "bg-red-500/10 text-red-300 border-red-500/40"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {message}
            </div>
          )}

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

        {/* Bloque de mensajes inline PREMIUM */}
        {message && (
          <div
            className={`mt-4 mb-4 text-sm p-4 rounded-xl text-left border flex items-start gap-3 ${
              messageType === "warning"
                ? "bg-amber-500/10 text-amber-200 border-amber-500/40"
                : messageType === "error"
                ? "bg-red-500/10 text-red-300 border-red-500/40"
                : messageType === "success"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                : "bg-blue-500/10 text-blue-200 border-blue-500/40"
            }`}
          >
            {/* Ícono premium (triángulo de alerta) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>

            <p>{message}</p>
          </div>
        )}

        <form
          noValidate
          onSubmit={handleSignUp}
          className="flex flex-col gap-4 text-left mt-2"
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-300 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setErrors((prev) => ({ ...prev, nombre: "" }));
                }}
                onBlur={(e) => setNombre(formatName(e.target.value))}
                className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                  errors.nombre ? "border-red-500" : "border-blue-900/40"
                }`}
              />
              {errors.nombre && (
                <p className="mt-1 text-xs text-red-400">{errors.nombre}</p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-300 mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => {
                  setApellido(e.target.value);
                  setErrors((prev) => ({ ...prev, apellido: "" }));
                }}
                onBlur={(e) => setApellido(formatName(e.target.value))}
                className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                  errors.apellido ? "border-red-500" : "border-blue-900/40"
                }`}
              />
              {errors.apellido && (
                <p className="mt-1 text-xs text-red-400">{errors.apellido}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value);
                setErrors((prev) => ({ ...prev, telefono: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.telefono ? "border-red-500" : "border-blue-900/40"
              }`}
            />
            {errors.telefono && (
              <p className="mt-1 text-xs text-red-400">{errors.telefono}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.email ? "border-red-500" : "border-blue-900/40"
              }`}
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
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.password ? "border-red-500" : "border-blue-900/40"
              }`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.confirmPassword
                  ? "border-red-500"
                  : "border-blue-900/40"
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl disabled:opacity-60"
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
