"use client";

import { MapPin, Phone, Mail, Instagram, ExternalLink } from "lucide-react";
import Container from "../ui/Container";

interface Props {
  data: any;
  colors: { primary: string };
  phoneOverride?: string | null;
}

export default function Contacto({ data, colors, phoneOverride }: Props) {
  if (!data) return null;

  // --- 1. LÓGICA DE TELÉFONO ---
  const telefono = phoneOverride || data.telefonos?.[0]?.numero || "Consultar";

  // --- 2. LÓGICA DE UBICACIÓN ---
  const dirObj = data.direcciones?.[0];
  const calle = dirObj?.calle?.trim() || "";
  const altura = dirObj?.altura_calle?.trim() || dirObj?.altura?.trim() || "";
  const barrio = dirObj?.barrio?.trim() || "";

  let direccionVisual = "";
  if (calle) {
    direccionVisual += calle;
    if (altura) direccionVisual += ` ${altura}`;
  }
  if (barrio) {
    direccionVisual += direccionVisual ? `, ${barrio}` : barrio;
  }
  const hayDireccion = direccionVisual.length > 0;

  const googleMapsUrl = hayDireccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionVisual)}`
    : "#";

  // --- 3. OTROS DATOS ---
  // Validamos que el email exista y no esté vacío
  const email = data.email && data.email.trim() !== "" ? data.email : null;
  const instagramUser = data.usuario_instagram;

  // --- 4. LÓGICA DE GRILLA DINÁMICA ---
  // Si hay email, usamos 4 columnas en Desktop. Si no, usamos 3.
  const gridColsClass = email
    ? "lg:grid-cols-4"
    : "lg:grid-cols-3 max-w-5xl mx-auto"; // max-w-5xl ayuda a que no se estiren demasiado si son 3

  return (
    <section className="py-20 bg-[#0b0d12] border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0b0d12] to-[#0b0d12] pointer-events-none" />

      <Container className="relative z-10">
        <div className="bg-[#15171e] rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              ¿Listo para jugar?
            </h2>
            <p className="text-gray-400">
              Estamos a tu disposición para reservas y consultas.
            </p>
          </div>

          {/* GRILLA DE CONTACTO DINÁMICA */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-6`}
          >
            {/* 1. UBICACIÓN */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group h-full">
              <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors mb-4 text-blue-500">
                <MapPin className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider">
                Ubicación
              </h3>

              {hayDireccion ? (
                <>
                  <p className="text-gray-300 font-medium mb-3 leading-relaxed max-w-[200px]">
                    {direccionVisual}
                  </p>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-full mt-auto"
                  >
                    Ver en mapa <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : (
                <p className="text-gray-500 italic text-sm">A confirmar</p>
              )}
            </div>

            {/* 2. TELÉFONO */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group h-full">
              <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors mb-4">
                <Phone className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider">
                Reservas
              </h3>
              <p className="text-gray-300 font-medium text-lg mb-1">
                {telefono}
              </p>
              {telefono !== "Consultar" && (
                <span className="text-xs text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded">
                  WhatsApp Disponible
                </span>
              )}
            </div>

            {/* 3. EMAIL (SOLO SE RENDERIZA SI EXISTE) */}
            {email && (
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group h-full">
                <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors mb-4">
                  <Mail className="w-6 h-6" style={{ color: colors.primary }} />
                </div>
                <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider">
                  Email
                </h3>
                <p className="text-gray-300 font-medium break-all">{email}</p>
              </div>
            )}

            {/* 4. REDES */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group h-full">
              <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors mb-4">
                <Instagram className="w-6 h-6 text-pink-500" />
              </div>
              <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider">
                Redes
              </h3>
              {instagramUser ? (
                <a
                  href={`https://instagram.com/${instagramUser.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-pink-400 font-medium transition-colors text-lg"
                >
                  {instagramUser.startsWith("@")
                    ? instagramUser
                    : `@${instagramUser}`}
                </a>
              ) : (
                <span className="text-gray-500 italic text-sm">
                  No especificado
                </span>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
