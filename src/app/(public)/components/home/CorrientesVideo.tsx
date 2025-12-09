"use client";

import { motion } from "framer-motion";
import { Button } from "../ui/Button";

export default function CorrientesVideo() {
  return (
    <section className="relative h-[80vh] w-full overflow-hidden text-white">
      {/* 🎥 Video de fondo */}
      <video
        src="/videos/videoctes.mp4"
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* 💙 Capa de degradado azul visible */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#001629]/80 via-[#002b5b]/60 to-transparent z-0" />

      {/* 🌓 Capa de opacidad para contraste */}
      <div className="absolute inset-0 bg-black/30 z-0" />

      {/* 📍 Contenido */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent"
        >
          Corrientes, nuestra inspiración
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="max-w-2xl text-neutral-200 text-lg md:text-xl leading-relaxed"
        >
          Desde la calidez de Corrientes, nació nuestra visión: crear un espacio
          donde la tecnología y el deporte se unan para potenciar el talento
          local y compartir la pasión por el pádel con todo el país.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="mt-8"
        >
          <Button variant="white" size="lg">
            Conocé nuestra historia
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
