"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import ProfesoresGrid from "./ProfesoresGrid";
import { Profesor } from "./ProfesorCard";

interface Props {
  profesores: Profesor[];
}

export default function ProfesoresUI({ profesores }: Props) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0d12] to-[#0e1a2b] text-gray-200">
      {/* HERO */}
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
          className="text-gray-400 text-lg max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Conocé a los entrenadores que forman parte de nuestro club.
          Capacitados para enseñar, formar y acompañar a cada jugador en su
          evolución.
        </motion.p>
      </section>

      {/* GRILLA DE PROFESORES (DINÁMICA) */}
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

      {/* EQUIPO COMPLETO (Imagen estática o decorativa) */}
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
            {/* Puedes hacer esta imagen dinámica en el futuro si quieres */}
            <Image
              src="/profesores/equipo.webp"
              alt="Equipo de profesores"
              width={1000}
              height={600}
              className="rounded-2xl shadow-lg border border-blue-900/40"
            />
          </motion.div>
        </div>
      </section>

      {/* CONTACTO WHATSAPP */}
      <section className="py-16 text-center border-t border-blue-900/30">
        <motion.h3
          className="text-2xl font-semibold text-white mb-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          ¿Sos profesor de pádel?
        </motion.h3>
        <motion.p
          className="text-gray-400 mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true }}
        >
          Contactate con nuestro equipo administrativo y sumate a la familia.
        </motion.p>

        <motion.a
          href="https://api.whatsapp.com/send?phone=5493794000000&text=Hola!%20Me%20gustaría%20postularme%20como%20profesor%20de%20pádel."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <MessageCircle className="w-5 h-5" />
          Contactarme por WhatsApp
        </motion.a>
      </section>
    </main>
  );
}
