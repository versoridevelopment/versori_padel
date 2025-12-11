// src/app/(public)/reserva/ReservaClient.tsx
"use client";

import { motion } from "framer-motion";
import CanchaCard from "@/app/(public)/components/reserva/CanchaCard";
import type { Club } from "@/lib/ObetenerClubUtils/getClubBySubdomain";

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
  return (
    <section className="min-h-screen bg-gradient-to-b from-[#001a33] to-[#003366] py-24 px-6 text-white flex flex-col items-center">
      {/* Header con datos del club */}
      <motion.div
        className="mb-10 text-center max-w-3xl"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-sm uppercase tracking-[0.3em] text-blue-200 mb-3">
          {club.nombre}
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight drop-shadow-lg mb-3">
          Selecciona tu cancha
        </h1>
        <p className="text-sm md:text-base text-blue-100">
          {club.texto_bienvenida_subtitulo ||
            "Elegí la cancha, el día y el horario que mejor se adapten a tu juego."}
        </p>
      </motion.div>

      {/* Grid de canchas */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {canchas.map((cancha) => (
          <CanchaCard
            key={cancha.id}
            nombre={cancha.nombre}
            descripcion={cancha.descripcion}
            imagen={cancha.imagen}
            slug={cancha.slug}
            deporte={cancha.deporte}
            tipo={cancha.tipo}
            capacidad={cancha.capacidad}
            precioHora={cancha.precioHora}
            esExterior={cancha.esExterior}
            />

        ))}

        {canchas.length === 0 && (
          <div className="col-span-full text-center text-blue-100">
            Aún no hay canchas configuradas para este club.
          </div>
        )}
      </motion.div>
    </section>
  );
}
