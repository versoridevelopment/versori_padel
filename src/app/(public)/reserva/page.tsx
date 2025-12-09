"use client";

import CanchaCard from "@/app/(public)/components/reserva/CanchaCard";
import { motion } from "framer-motion";

export default function Reserva() {
  const canchas = [
    {
      nombre: "Cancha 1",
      slug: "cancha-1",
      imagen: "/reserva/cancha_interior.jpg",
    },
    {
      nombre: "Cancha 2",
      slug: "cancha-2",
      imagen: "/reserva/cancha_interior.jpg",
    },
    {
      nombre: "Cancha 3",
      slug: "cancha-3",
      descripcion: "Aire libre 🌤️🍃",
      imagen: "/reserva/cancha_exterior.jpg",
    },
    {
      nombre: "Cancha 4",
      slug: "cancha-4",
      imagen: "/reserva/cancha_interior.jpg",
    },
    {
      nombre: "Cancha 5",
      slug: "cancha-5",
      imagen: "/reserva/cancha_interior.jpg",
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#001a33] to-[#003366] py-24 px-6 text-white flex flex-col items-center">
      <motion.h1
        className="text-5xl md:text-6xl font-extrabold mb-14 uppercase tracking-tight drop-shadow-lg"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        SELECCIONA TU CANCHA
      </motion.h1>
      {/* Grid de canchas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-Acols-3 gap-8 w-full max-w-6xl">
        {canchas.map((cancha, i) => (
          <CanchaCard
            key={i}
            nombre={cancha.nombre}
            descripcion={cancha.descripcion}
            imagen={cancha.imagen}
            slug={cancha.slug} // ✅ usamos slug, no onClick
          />
        ))}
      </div>
    </section>
  );
}
