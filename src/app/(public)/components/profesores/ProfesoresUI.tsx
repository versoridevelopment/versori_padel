"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import ProfesoresGrid from "./ProfesoresGrid";
import { Profesor } from "./ProfesorCard"; // Asegúrate de que la ruta sea correcta

interface Props {
  profesores: Profesor[];
  teamPhotoUrl?: string | null; // <--- Nueva prop para la foto grupal
}

export default function ProfesoresUI({ profesores, teamPhotoUrl }: Props) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0d12] to-[#0e1a2b] text-gray-200">
      {/* --- HERO --- */}
      <section className="text-center py-24 border-b border-blue-900/30">
        <motion.h1
          className="text-5xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          » PROFESORES «
        </motion.h1>
        <motion.p
          className="text-gray-400 text-lg max-w-3xl mx-auto px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Conocé a los entrenadores que forman parte de nuestro club.
          Capacitados para enseñar, formar y acompañar a cada jugador en su
          evolución.
        </motion.p>
      </section>

      {/* --- GRILLA DE PROFESORES --- */}
      <section className="py-20 container mx-auto px-6 max-w-6xl">
        <motion.h2
          className="text-3xl font-semibold text-center text-white mb-14"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          Clases individuales y grupales
        </motion.h2>

        <ProfesoresGrid profesores={profesores} />
      </section>

      {/* --- EQUIPO COMPLETO (Dinámico) --- */}
      {/* Solo se renderiza si teamPhotoUrl tiene valor */}
      {teamPhotoUrl && (
        <section className="py-20 bg-[#0d1522] border-t border-blue-900/30">
          <div className="container mx-auto px-6 text-center">
            <motion.h2
              className="text-3xl font-semibold text-white mb-10"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              Nuestro equipo de profesores
            </motion.h2>

            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              {/* Contenedor con aspecto de imagen para evitar saltos de layout */}
              <div className="relative w-full max-w-5xl aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl border border-blue-900/40">
                <Image
                  src={teamPhotoUrl}
                  alt="Equipo de profesores"
                  fill
                  className="object-cover"
                />
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </main>
  );
}
