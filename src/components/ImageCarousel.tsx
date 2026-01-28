"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

interface Props {
  images: string[];
  title?: string;
}

export function ImageCarousel({ images, title }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Placeholder si no hay imágenes
  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-video bg-slate-800/50 rounded-3xl flex flex-col items-center justify-center text-slate-500 border border-white/5 backdrop-blur-sm">
        <ImageIcon className="w-16 h-16 mb-2 opacity-50" />
        <span className="text-sm font-medium">Sin imágenes disponibles</span>
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

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
  };

  return (
    <div className="relative w-full aspect-square md:aspect-video lg:h-[500px] lg:aspect-auto group rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      {/* IMAGEN PRINCIPAL */}
      <div className="w-full h-full relative bg-gray-900">
        <Image
          src={images[currentIndex]}
          alt={`${title || "Quincho"} - foto ${currentIndex + 1}`}
          fill
          className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
          priority={currentIndex === 0}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* --- EFECTOS DE DEGRADADO (Aquí está la magia) --- */}

        {/* 1. Sombra interior sutil (Vignette) para dar profundidad en bordes */}
        <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.5)] pointer-events-none z-10" />

        {/* 2. Degradado Inferior (Cinemático) - Integra la imagen con el fondo */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent opacity-60 z-10 pointer-events-none" />

        {/* 3. Degradado Superior muy sutil - Para que el borde superior no sea duro */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent opacity-40 z-10 pointer-events-none" />
      </div>

      {/* CONTROLES (Elevamos el z-index para que queden sobre los degradados) */}

      {images.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/10 z-20 hover:scale-110 active:scale-95"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/20 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/10 z-20 hover:scale-110 active:scale-95"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* INDICADORES */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {images.map((_, slideIndex) => (
              <button
                key={slideIndex}
                onClick={() => goToSlide(slideIndex)}
                className={`transition-all duration-500 rounded-full shadow-lg border border-black/10 ${
                  currentIndex === slideIndex
                    ? "bg-white w-8 h-1.5 opacity-100"
                    : "bg-white/40 w-1.5 h-1.5 hover:bg-white/80"
                }`}
                aria-label={`Ir a imagen ${slideIndex + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
