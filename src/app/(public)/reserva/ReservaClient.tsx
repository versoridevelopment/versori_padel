"use client";

import { motion } from "framer-motion";
import CanchaCard from "@/app/(public)/components/reserva/CanchaCard";
import type { Club } from "@/lib/ObetenerClubUtils/getClubBySubdomain";
import { CSSProperties } from "react";

type CanchaUI = {
  id: number;
  nombre: string;
  descripcion?: string;
  imagen: string;
  slug: string;
  deporte: string;
  tipo: string;
  capacidad?: number | null;
  precioHora: number;
  esExterior: boolean;
};

interface ReservaClientProps {
  club: Club;
  canchas: CanchaUI[];
}

export default function ReservaClient({ club, canchas }: ReservaClientProps) {
  // 🔥 Definimos las variables CSS dinámicas basadas en el club
  const customStyle = {
    "--primary": club.color_primario || "#3b82f6",
    "--secondary": club.color_secundario || "#1e40af",
    "--text-club": club.color_texto || "#ffffff",
  } as CSSProperties;

  return (
    <section
      style={customStyle}
      // ✅ CAMBIO AQUÍ: El gradiente ahora va de negro profundo (gray-950) hacia el color PRIMARIO con opacidad baja (to-[var(--primary)]/30)
      className="min-h-screen bg-gradient-to-br from-gray-950 via-[#020617] to-[var(--primary)]/30 pt-28 pb-12 px-4 sm:px-6 flex flex-col items-center relative selection:bg-[var(--primary)] selection:text-white"
    >
      {/* Glow Effect superior (luz cenital del color primario) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-[var(--primary)] rounded-full blur-[120px] opacity-15 pointer-events-none" />

      {/* Header */}
      <motion.div
        className="mb-12 text-center max-w-3xl relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/80 mb-4 shadow-lg backdrop-blur-md">
          {club.nombre}
        </span>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4 drop-shadow-2xl">
          Selecciona tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[var(--primary)]">Cancha</span>
        </h1>

        <p className="text-sm md:text-lg text-blue-200/70 max-w-2xl mx-auto leading-relaxed">
          {club.texto_bienvenida_subtitulo ||
            "Explora nuestras instalaciones de primer nivel y reserva tu lugar en segundos."}
        </p>
      </motion.div>

      {/* Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full max-w-7xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {canchas.map((cancha, index) => (
          <CanchaCard
            key={cancha.id}
            {...cancha}
            index={index} 
          />
        ))}

        {canchas.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
            <p className="text-blue-200/50 text-lg">
              Aún no hay canchas disponibles en este momento.
            </p>
          </div>
        )}
      </motion.div>
    </section>
  );
}