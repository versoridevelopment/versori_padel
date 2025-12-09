"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TextSliderProps {
  text: string;
  speed?: number; // segundos para recorrer toda la cinta
}

export default function TextSlider({ text, speed = 25 }: TextSliderProps) {
  const [key, setKey] = useState(0);
  const repeatedText = Array(20).fill(text).join(" • ");

  // Si cambia la velocidad, forzamos un re-render para actualizar el ciclo de animación
  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [speed]);

  return (
    <div className="relative overflow-hidden bg-neutral-950 py-6 border-t border-neutral-800">
      <div className="flex whitespace-nowrap">
        {/* Bloque 1 */}
        <motion.span
          key={`left-${key}`}
          className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-300 bg-clip-text text-transparent  pr-12"
          animate={{ x: ["0%", "-100%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: speed,
          }}
        >
          {repeatedText}
        </motion.span>

        {/* Bloque 2 */}
        <motion.span
          key={`right-${key}`}
          className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 to-blue-300 bg-clip-text text-transparent  pr-12"
          animate={{ x: ["100%", "0%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: speed,
          }}
        >
          {repeatedText}
        </motion.span>
      </div>
    </div>
  );
}
