"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface CanchaCardProps {
  nombre: string;
  descripcion?: string;
  imagen: string;
  slug: string;
}

export default function CanchaCard({
  nombre,
  descripcion,
  imagen,
  slug,
}: CanchaCardProps) {
  return (
    <Link href={`/reserva/${slug}`}>
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 250, damping: 15 }}
        className="cursor-pointer bg-[#0b2545] border border-[#1b4e89] rounded-2xl overflow-hidden shadow-lg hover:shadow-blue-800/40 transition-all duration-300"
      >
        {/* Rectángulo superior: vista previa */}
        <div className="relative w-full h-48">
          <Image
            src={imagen}
            alt={nombre}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>

        {/* Rectángulo inferior */}
        <div className="p-4 text-center bg-[#102b55]">
          <h3 className="text-xl font-bold text-white tracking-wide">
            {nombre}
          </h3>
          {descripcion && (
            <p className="text-sm text-blue-300 mt-1">{descripcion}</p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
