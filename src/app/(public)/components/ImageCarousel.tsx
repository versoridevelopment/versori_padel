"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  title: string;
}

// CAMBIO: Usamos 'export function' explícitamente (sin 'default')
export function ImageCarousel({ images, title }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-800 flex items-center justify-center border border-white/10">
        <span className="text-slate-500">Sin imágenes disponibles</span>
      </div>
    );
  }

  const prevSlide = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const nextSlide = () => {
    const isLastSlide = currentIndex === images.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  return (
    <div className="relative group w-full h-full">
      {/* Imagen Principal */}
      <div className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900">
        <Image
          src={images[currentIndex]}
          alt={`${title} - foto ${currentIndex + 1}`}
          fill
          className="object-cover transition-transform duration-500 hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={currentIndex === 0}
        />

        {/* Gradiente sutil abajo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
      </div>

      {/* Botones de Navegación (Solo si hay más de 1 foto) */}
      {images.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 hover:bg-white text-white hover:text-black p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10"
            aria-label="Imagen anterior"
            title="Imagen anterior"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 hover:bg-white text-white hover:text-black p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10"
            aria-label="Siguiente imagen"
            title="Siguiente imagen"
          >
            <ChevronRight size={24} />
          </button>

          {/* Indicadores (Puntos) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {images.map((_, slideIndex) => (
              <div
                key={slideIndex}
                onClick={() => setCurrentIndex(slideIndex)}
                className={`transition-all duration-300 cursor-pointer rounded-full shadow-sm ${
                  currentIndex === slideIndex
                    ? "bg-white w-8 h-2"
                    : "bg-white/50 w-2 h-2 hover:bg-white/80"
                }`}
                title={`Ir a imagen ${slideIndex + 1}`}
              ></div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
