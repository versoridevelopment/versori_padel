"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Phone, Instagram } from "lucide-react";

interface ProfesorCardProps {
  nombre: string;
  telefono: string;
  instagram: string;
  imagen: string;
}

export default function ProfesorCard({
  nombre,
  telefono,
  instagram,
  imagen,
}: ProfesorCardProps) {
  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <Image
        src={imagen}
        alt={nombre}
        width={550}
        height={400}
        className="rounded-lg shadow-lg border border-blue-900/40 object-cover"
      />
      <h3 className="text-white font-semibold text-lg mt-4">{nombre}</h3>

      <div className="flex flex-col items-center text-sm text-gray-400 mt-2">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-green-400" />
          <span>{telefono}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Instagram className="w-4 h-4 text-pink-500" />
          <span>{instagram}</span>
        </div>
      </div>
    </motion.div>
  );
}
