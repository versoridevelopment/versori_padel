// src/app/(public)/components/profesores/ProfesorCard.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Phone, Instagram, User } from "lucide-react";

export interface Profesor {
  id_profesor: number;
  nombre: string;
  telefono?: string;
  instagram?: string;
  foto_url?: string;
  descripcion?: string;
}

export default function ProfesorCard({
  nombre,
  telefono,
  instagram,
  foto_url,
  descripcion,
}: Profesor) {
  return (
    <motion.div
      className="flex flex-col items-center text-center group"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className="relative w-full max-w-[400px] aspect-[3/4] overflow-hidden rounded-lg shadow-lg border border-blue-900/40">
        {foto_url ? (
          <Image
            src={foto_url}
            alt={nombre}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-[#0e1a2b] flex flex-col items-center justify-center text-gray-500">
            <User className="w-16 h-16 mb-2 opacity-50" />
            <span></span>
          </div>
        )}
      </div>

      <h3 className="text-white font-semibold text-lg mt-4">{nombre}</h3>
      {descripcion && (
        <p className="text-gray-400 text-xs mt-1 max-w-xs line-clamp-2">
          {descripcion}
        </p>
      )}

      <div className="flex flex-col items-center text-sm text-gray-400 mt-3 space-y-1">
        {telefono && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-400" />
            <span>{telefono}</span>
          </div>
        )}
        {instagram && (
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4 text-pink-500" />
            <a
              href={`https://instagram.com/${instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-pink-400 transition-colors"
            >
              {instagram}
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
