"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface CanchaCardProps {
  nombre: string;
  descripcion?: string;
  imagen: string;
  slug: string;

  // Extras (opcionales pero recomendados)
  deporte?: string;              // "padel" | "futbol"
  tipo?: string;                 // "futbol_5", "padel_standard", etc.
  capacidad?: number | null;     // 4, 10, 14...
  precioHora?: number;           // 5000, 7000...
  esExterior?: boolean;          // true = exterior, false = techada
}

export default function CanchaCard({
  nombre,
  descripcion,
  imagen,
  slug,
  deporte,
  tipo,
  capacidad,
  precioHora,
  esExterior,
}: CanchaCardProps) {
  const isPadel = deporte?.toLowerCase() === "padel";
  const isFutbol = deporte?.toLowerCase() === "futbol";

  const deporteLabel = isPadel
    ? "Pádel"
    : isFutbol
    ? "Fútbol"
    : deporte ?? "Cancha";

  const tipoLabel = tipo?.replace(/_/g, " ").toUpperCase();

  const formattedPrice =
    typeof precioHora === "number"
      ? new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        }).format(precioHora)
      : null;

  const ambienteLabel =
    esExterior === undefined
      ? null
      : esExterior
      ? "Exterior"
      : "Interior / Techada";

  const deporteBadgeClasses = isPadel
    ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/40"
    : isFutbol
    ? "bg-orange-500/10 text-orange-300 border-orange-400/40"
    : "bg-sky-500/10 text-sky-300 border-sky-400/40";

  return (
    <Link href={`/reserva/${slug}`} className="block">
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative cursor-pointer rounded-2xl overflow-hidden border border-slate-600/60 bg-[#0b2545]/90 shadow-lg shadow-black/40 hover:shadow-blue-800/40 hover:border-blue-400/70 transition-all duration-300 group"
      >
        {/* Imagen principal */}
        <div className="relative w-full h-48">
          <Image
            src={imagen}
            alt={nombre}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 33vw"
          />

          {/* Etiqueta de ambiente (interior / exterior) */}
          {ambienteLabel && (
            <div className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-slate-100 backdrop-blur-sm border border-white/20">
              {ambienteLabel}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-4 bg-[#102b55]/95">
          {/* Fila superior: deporte + tipo */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${deporteBadgeClasses}`}
            >
              {deporteLabel}
            </span>

            {tipoLabel && (
              <span className="inline-flex rounded-full bg-slate-900/60 px-2.5 py-1 text-[0.7rem] font-medium text-slate-200 border border-slate-500/60">
                {tipoLabel}
              </span>
            )}
          </div>

          {/* Nombre de cancha */}
          <h3 className="text-lg md:text-xl font-bold text-white tracking-wide">
            {nombre}
          </h3>

          {/* Descripción corta */}
          {descripcion && (
            <p className="mt-1 text-xs md:text-sm text-blue-200/90 line-clamp-2">
              {descripcion}
            </p>
          )}

          {/* Fila inferior: capacidad + precio */}
          <div className="mt-3 flex items-center justify-between gap-3 text-xs md:text-sm">
            <div className="flex flex-col text-blue-200/90">
              {typeof capacidad === "number" && capacidad > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-[0.9rem]">👥</span>
                  <span>Hasta {capacidad} jugadores</span>
                </span>
              )}
            </div>

            {formattedPrice && (
              <div className="text-right">
                <span className="block text-[0.7rem] uppercase tracking-[0.15em] text-blue-300/80">
                  Desde
                </span>
                <span className="text-base md:text-lg font-extrabold text-blue-100">
                  {formattedPrice}
                </span>
                <span className="ml-1 text-[0.7rem] text-blue-200/80">
                  / hora
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
