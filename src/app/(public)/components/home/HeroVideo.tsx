// src/components/home/HeroVideo.tsx
"use client";

import Link from "next/link";
import { Button } from "../ui/Button";
import Container from "../ui/Container";
import { motion } from "framer-motion";

export default function HeroVideo() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* 🎥 Video de fondo */}
      <video
        src="/videos/video_cancha_padel.mp4"
        className="absolute inset-0 w-full h-full object-cover -z-20"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* 💙 Capa de degradado azul visible */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#001629]/80 via-[#002b5b]/60 to-transparent z-0" />

      {/* 🌓 Capa de opacidad para contraste */}
      <div className="absolute inset-0 bg-black/30 z-0" />

      {/* 🧠 Contenido principal */}
      <Container className="relative z-10 text-center flex flex-col items-center justify-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight drop-shadow-lg"
        >
          Complejo{" "}
          <span className="bg-gradient-to-r from-emerald-500 to-blue-300 bg-clip-text text-transparent">
            Versori Pádel
          </span>
        </motion.h1>

        {/* 🟦 Botón central de acción */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-5"
        >
          <Link href="/reserva">
            <Button
              variant="primary"
              size="lg"
              className="px-10 py-4 text-lg font-semibold rounded-2xl shadow-md hover:shadow-green-500/30 transition-all duration-300"
            >
              Reservar cancha
            </Button>
          </Link>
        </motion.div>
      </Container>
    </section>
  );
}
