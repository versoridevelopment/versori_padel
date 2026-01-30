"use client";

import { useState, useEffect, FormEvent, FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

// ✅ IMPORTANTE: usar browser-only client (implicit)
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

import { getSubdomainFromHost } from "@/lib/ObetenerClubUtils/tenantUtils";
import { getClubBySubdomain } from "@/lib/ObetenerClubUtils/getClubBySubdomain";

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

const COOLDOWN_SECONDS = 60;

async function apiResendSmart(email: string, redirectTo: string) {
  const r = await fetch("/api/auth/resend-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirectTo }),
  });

  const j = await r.json().catch(() => ({}));
  return {
    ok: Boolean(j.ok),
    status: j.status as "CONFIRMED" | "RESENT" | "NOT_FOUND" | undefined,
    error: j.error as string | undefined,
  };
}

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
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  // ✅ Cooldown / Resend
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const fetchClub = async () => {
      const host = window.location.host;
      const hostname = host.split(":")[0];

      const sub = getSubdomainFromHost(hostname);
      setSubdomain(sub);

      if (sub) {
        const club = await getClubBySubdomain(sub);
        if (club) {
          setClubId(club.id_club);
          setClubLogo(club.logo_url);
        }
      }

      setClubLoading(false);
    };

    fetchClub();
  }, []);

  // --- Cooldown helpers (persistente) ---
  const cooldownKey = (mail: string) =>
    `resend_cooldown_until:${mail.toLowerCase().trim()}`;

  const startCooldown = (mail: string) => {
    const until = Date.now() + COOLDOWN_SECONDS * 1000;
    try {
      localStorage.setItem(cooldownKey(mail), String(until));
    } catch {}
    setCooldown(COOLDOWN_SECONDS);
  };

  const syncCooldownFromStorage = (mail: string) => {
    try {
      const raw = localStorage.getItem(cooldownKey(mail));
      if (!raw) return;
      const until = Number(raw);
      if (!Number.isFinite(until)) return;

      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setCooldown(remaining);
    } catch {}
  };

  useEffect(() => {
    if (!isSubmitted) return;
    const mail = email.trim();
    if (!mail) return;

    syncCooldownFromStorage(mail);

    const id = window.setInterval(() => {
      try {
        const raw = localStorage.getItem(cooldownKey(mail));
        const until = raw ? Number(raw) : 0;
        const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        setCooldown(remaining);
      } catch {
        setCooldown((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitted]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) newErrors.nombre = "El nombre es obligatorio.";
    else if (nombre.trim().length < 2)
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres.";

    if (!apellido.trim()) newErrors.apellido = "El apellido es obligatorio.";
    else if (apellido.trim().length < 2)
      newErrors.apellido = "El apellido debe tener al menos 2 caracteres.";

    const telClean = telefono.replace(/\D/g, "");
    if (!telClean) newErrors.telefono = "El teléfono es obligatorio.";
    else if (telClean.length < 6)
      newErrors.telefono = "El teléfono debe tener al menos 6 dígitos.";

    if (!email.trim()) newErrors.email = "El email es obligatorio.";
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim()))
        newErrors.email = "Ingresá un email válido.";
    }

    if (!password) newErrors.password = "La contraseña es obligatoria.";
    else if (password.length < 6)
      newErrors.password = "La contraseña debe tener al menos 6 caracteres.";

    if (!confirmPassword)
      newErrors.confirmPassword = "Debés confirmar la contraseña.";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Las contraseñas no coinciden.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setMessage("Revisá los campos marcados en rojo.");
      setMessageType("error");
      return false;
    }

    return true;
  };

  // ✅ redirectTo para implicit: página CLIENT que lee hash (#access_token)
  const buildEmailRedirectTo = () => {
    const origin = window.location.origin; // mismo subdominio
    return `${origin}/auth/confirm?next=${encodeURIComponent("/")}`;
  };

  // ✅ Flujo: email existe -> usamos endpoint y reenviamos
  const smartExistingFlow = async (mail: string) => {
    const redirectTo = buildEmailRedirectTo();
    const res = await apiResendSmart(mail, redirectTo);

    if (!res.ok) {
      setMessage("No se pudo procesar el reenvío: " + (res.error || "Error"));
      setMessageType("error");
      setIsSubmitted(false);
      return;
    }

    if (res.status === "CONFIRMED") {
      setMessage(
        "Atención: este email ya está registrado. Iniciá sesión con tu contraseña original."
      );
      setMessageType("warning");
      setIsSubmitted(false);
      return;
    }

    setMessage(
      "Si este email existe y todavía no está verificado, te reenviamos el enlace de verificación. Revisá tu correo."
    );
    setMessageType("warning");
    setIsSubmitted(true);
    startCooldown(mail);
  };

  const handleResend = async () => {
    const mail = email.trim().toLowerCase();
    if (!mail) return;
    if (cooldown > 0) return;

    setResending(true);
    setMessage(null);
    setMessageType(null);

    try {
      const redirectTo = buildEmailRedirectTo();
      const res = await apiResendSmart(mail, redirectTo);

      if (!res.ok) {
        setMessage("No se pudo reenviar: " + (res.error || "Error"));
        setMessageType("error");
        setResending(false);
        return;
      }

      if (res.status === "CONFIRMED") {
        setMessage("Este email ya está verificado. Iniciá sesión con tu contraseña.");
        setMessageType("warning");
        setResending(false);
        return;
      }

      setMessage("Listo ✅ Si corresponde, te reenviamos el enlace. Revisá tu correo.");
      setMessageType("success");
      startCooldown(mail);
      setResending(false);
    } catch {
      setMessage("Ocurrió un error al reenviar. Intentá de nuevo.");
      setMessageType("error");
      setResending(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setMessageType(null);
    setErrors({});

    if (!validateForm()) return;

    if (!clubId || !subdomain) {
      setMessage("Error detectando el club. Intentá recargar la página.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);

    const mail = email.trim().toLowerCase();

    // ✅ check profiles (ok mantenerlo)
    const { data: existingProfile, error: profileError } = await supabaseBrowser
      .from("profiles")
      .select("id_usuario")
      .eq("email", mail)
      .maybeSingle();

    if (profileError) {
      console.error("[Register] Error consultando profiles:", profileError);
      setMessage("Ocurrió un error al verificar el usuario. Intentá más tarde.");
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    if (existingProfile) {
      await smartExistingFlow(mail);
      setIsLoading(false);
      return;
    }

    const redirectTo = buildEmailRedirectTo();

    const { error: signUpError } = await supabaseBrowser.auth.signUp({
      email: mail,
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
      console.error("[Register] signUp error:", signUpError);
      const msg = (signUpError.message || "").toLowerCase();

      if (msg.includes("already registered") || msg.includes("already exists")) {
        await smartExistingFlow(mail);
        setIsLoading(false);
        return;
      }

      setMessage("Error al registrar: " + signUpError.message);
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setMessage("Te enviamos un enlace de verificación. Revisá tu correo para activar tu cuenta.");
    setMessageType("success");
    setIsSubmitted(true);
    startCooldown(mail);
    setIsLoading(false);
  };

  if (clubLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white">
        <p>Cargando...</p>
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
                  : messageType === "warning"
                  ? "bg-amber-500/10 text-amber-200 border-amber-500/40"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full bg-blue-600 hover:bg-blue-700 transition-all py-3 rounded-xl disabled:opacity-60"
            >
              {resending
                ? "Reenviando..."
                : cooldown > 0
                ? `Reenviar email en ${cooldown}s`
                : "Reenviar email de verificación"}
            </button>

            <p className="text-xs text-neutral-400">
              Si no lo ves, revisá Spam/Promociones. El enlace puede tardar unos segundos.
            </p>
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
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6 pt-32 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-10 w-full max-w-md shadow-2xl text-center"
      >
        {clubLogo ? (
          <div className="relative w-24 h-24 mx-auto mb-6">
            <Image src={clubLogo} alt="Logo del Club" fill className="object-contain" priority />
          </div>
        ) : (
          <div className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center font-bold text-2xl">
            C
          </div>
        )}

        <h1 className="text-3xl font-bold mb-2">Crear una cuenta</h1>

        {message && (
          <div
            className={`mt-4 mb-4 text-sm p-4 rounded-xl text-left border flex items-start gap-3 ${
              messageType === "warning"
                ? "bg-amber-500/10 text-amber-200 border-amber-500/40"
                : messageType === "error"
                ? "bg-red-500/10 text-red-300 border-red-500/40"
                : "bg-blue-500/10 text-blue-200 border-blue-500/40"
            }`}
          >
            <p>{message}</p>
          </div>
        )}

        <form noValidate onSubmit={handleSignUp} className="flex flex-col gap-4 text-left mt-2">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="nombre" className="block text-sm text-gray-300 mb-1">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                title="Nombre"
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
              {errors.nombre && <p className="mt-1 text-xs text-red-400">{errors.nombre}</p>}
            </div>

            <div className="flex-1">
              <label htmlFor="apellido" className="block text-sm text-gray-300 mb-1">
                Apellido
              </label>
              <input
                id="apellido"
                type="text"
                title="Apellido"
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
              {errors.apellido && <p className="mt-1 text-xs text-red-400">{errors.apellido}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm text-gray-300 mb-1">
              Teléfono
            </label>
            <input
              id="telefono"
              type="tel"
              title="Teléfono"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value);
                setErrors((prev) => ({ ...prev, telefono: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.telefono ? "border-red-500" : "border-blue-900/40"
              }`}
            />
            {errors.telefono && <p className="mt-1 text-xs text-red-400">{errors.telefono}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              title="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.email ? "border-red-500" : "border-blue-900/40"
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              title="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.password ? "border-red-500" : "border-blue-900/40"
              }`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-gray-300 mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              title="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              className={`w-full p-3 rounded-xl bg-[#112d57] border ${
                errors.confirmPassword ? "border-red-500" : "border-blue-900/40"
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
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
