"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Users, Zap, Sun, Cloud, ArrowRight } from "lucide-react";

interface CanchaCardProps {
  nombre: string;
  descripcion?: string;
  imagen: string;
  slug: string;
  deporte?: string;
  tipo?: string;
  capacidad?: number | null;
  precioHora?: number;
  esExterior?: boolean;
  index?: number; // Para animaciones
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
  index = 0,
}: CanchaCardProps) {
  const isPadel = deporte?.toLowerCase() === "padel";
  const isFutbol = deporte?.toLowerCase() === "futbol";

  const tipoLabel = tipo?.replace(/_/g, " ").toUpperCase();

  const formattedPrice =
    typeof precioHora === "number"
      ? new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        }).format(precioHora)
      : null;

  // Saneamiento de imagen
  const safeImage =
    typeof imagen === "string" && imagen.trim().length > 0
      ? imagen.trim()
      : "/reserva/cancha_interior.jpg";

  return (
    <Link href={`/reserva/${slug}`} className="block group h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="h-full relative flex flex-col rounded-3xl overflow-hidden border border-white/10 bg-[#111827]/60 backdrop-blur-xl shadow-xl hover:shadow-[0_0_30px_-5px_var(--primary)] hover:border-[var(--primary)]/50 transition-all duration-300"
      >
        {/* Imagen principal con efecto Zoom */}
        <div className="relative w-full h-56 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent z-10 opacity-90" />
          
          <Image
            src={safeImage}
            alt={nombre}
            fill
            className="object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out"
            sizes="(max-width: 768px) 100vw, 33vw"
          />

          {/* Badges Flotantes */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
             {esExterior !== undefined && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white">
                {esExterior ? <Sun className="w-3 h-3 text-amber-400" /> : <Cloud className="w-3 h-3 text-blue-400" />}
                {esExterior ? "Exterior" : "Indoor"}
              </span>
            )}
            {tipoLabel && (
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-neutral-200">
                {tipoLabel}
              </span>
            )}
          </div>

          {/* Nombre sobre la imagen */}
          <div className="absolute bottom-4 left-4 z-20">
             <div className="flex items-center gap-2 mb-1">
                {isPadel && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">PADEL</span>}
                {isFutbol && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">FUTBOL</span>}
             </div>
             <h3 className="text-2xl font-extrabold text-white tracking-tight leading-none group-hover:text-[var(--primary)] transition-colors">
                {nombre}
             </h3>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-5 flex flex-col flex-grow">
          
          {descripcion && (
            <p className="text-sm text-neutral-400 line-clamp-2 mb-4 flex-grow">
              {descripcion}
            </p>
          )}

          {/* Separador */}
          <div className="h-px w-full bg-white/5 my-2" />

          {/* Footer Card */}
          <div className="flex items-center justify-between pt-2 mt-auto">
            
            <div className="flex items-center gap-3 text-neutral-400 text-xs font-medium">
              {capacidad && (
                 <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg">
                    <Users className="w-3.5 h-3.5" />
                    <span>{capacidad}p</span>
                 </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg">
                <Zap className="w-3.5 h-3.5" />
                <span>Pro</span>
              </div>
            </div>

            {formattedPrice ? (
              <div className="text-right">
                <p className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Precio hora</p>
                <p className="text-lg font-bold text-white group-hover:text-[var(--primary)] transition-colors">
                  {formattedPrice}
                </p>
              </div>
            ) : (
               <div className="flex items-center gap-1 text-[var(--primary)] text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
                  Ver Disponibilidad <ArrowRight className="w-4 h-4"/>
               </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}