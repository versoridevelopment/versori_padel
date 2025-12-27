"use client";

import React from "react";
import Image from "next/image";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import type { Settings } from "react-slick";

interface Marca {
  id: string;
  tipo: "imagen" | "texto";
  valor: string;
}

export default function Marcas({ marcas }: { marcas: Marca[] }) {
  if (!marcas || marcas.length === 0) return null;

  // Configuración "Marquee" (Cinta transportadora infinita)
  const settings: Settings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 5000, // Ajusta la suavidad del desplazamiento (3000-5000 es ideal)
    slidesToShow: 5, // Muestra menos slides para que sean más grandes y se muevan sí o sí
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0, // Esto hace que el movimiento sea continuo sin pausas
    cssEase: "linear", // Movimiento lineal constante
    pauseOnHover: false, // No detenerse al pasar el mouse
    variableWidth: false,
    responsive: [
      {
        breakpoint: 1280, // Pantallas grandes
        settings: { slidesToShow: 4 },
      },
      {
        breakpoint: 1024, // Laptops
        settings: { slidesToShow: 3 },
      },
      {
        breakpoint: 768, // Tablets
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 480, // Celulares
        settings: { slidesToShow: 2 }, // Muestra 2 grandes en celular
      },
    ],
  };

  return (
    <section className="w-full bg-[#050608] border-y border-white/5 py-10 overflow-hidden relative">
      {/* Degradados laterales para suavizar la entrada/salida */}
      <div className="absolute top-0 left-0 h-full w-24 bg-gradient-to-r from-[#050608] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-[#050608] to-transparent z-10 pointer-events-none" />

      <div className="w-full">
        <Slider {...settings}>
          {marcas.map((marca) => (
            <div key={marca.id} className="outline-none px-4">
              {/* Contenedor del logo: Aumentado de tamaño */}
              <div className="flex items-center justify-center h-32 w-full opacity-60 hover:opacity-100 transition-opacity duration-300">
                {marca.tipo === "imagen" ? (
                  // TAMAÑOS AUMENTADOS: h-24 w-48 (antes eran mucho más chicos)
                  <div className="relative h-20 w-40 md:h-24 md:w-52">
                    {marca.valor ? (
                      <Image
                        src={marca.valor}
                        alt="Marca sponsor"
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 160px, 250px"
                      />
                    ) : (
                      <span className="text-xs text-red-500">Error URL</span>
                    )}
                  </div>
                ) : (
                  // Texto más grande y legible
                  <span className="text-xl md:text-2xl font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {marca.valor}
                  </span>
                )}
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
}
