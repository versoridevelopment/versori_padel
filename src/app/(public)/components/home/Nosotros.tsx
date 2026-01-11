"use client";

import Image from "next/image";
import Link from "next/link";
import Slider from "react-slick";
import Container from "../ui/Container";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface Props {
  config: any;
  clubColors: { primary: string; secondary: string };
}

export default function Nosotros({ config, clubColors }: Props) {
  const settings = {
    dots: true,
    fade: true, // CAMBIO 1: Transición suave en lugar de deslizamiento
    infinite: true,
    speed: 1500, // CAMBIO 2: Transición más lenta (1.5s) para elegancia
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 4500, // Tiempo entre fotos
    pauseOnHover: false,
  };

  const titulo =
    config?.home_titulo || config?.historia_titulo || "Nuestra Historia";
  const descripcion =
    config?.home_descripcion ||
    config?.hero_descripcion ||
    "Conocé más sobre nuestro club...";

  const images =
    config?.galeria_inicio && config.galeria_inicio.length > 0
      ? config.galeria_inicio
      : ["/placeholder-nosotros.jpg"];

  return (
    <section className="py-20 bg-[#0b0d12] text-white border-t border-white/5 overflow-hidden">
      <Container className="grid md:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="space-y-6 animate-in slide-in-from-left duration-700 relative z-10">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 backdrop-blur-sm"
            style={{
              color: clubColors.primary,
              borderColor: `${clubColors.primary}40`,
            }}
          >
            Sobre Nosotros
          </div>

          <h2 className="text-4xl md:text-5xl font-bold leading-tight drop-shadow-lg">
            {titulo}
          </h2>

          <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
            {descripcion}
          </p>

          <Link href="/nosotros">
            <button
              className="mt-4 px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:scale-105 shadow-lg hover:shadow-xl"
              style={{
                backgroundColor: clubColors.primary,
                boxShadow: `0 10px 30px -10px ${clubColors.primary}60`, // Sombra con el color del club
              }}
            >
              Leer historia completa
            </button>
          </Link>
        </div>

        {/* Slider con Efectos Profesionales */}
        <div className="relative">
          {/* Elemento decorativo brillante detrás del slider */}
          <div
            className="absolute -inset-4 opacity-30 blur-3xl rounded-full -z-10"
            style={{ backgroundColor: clubColors.primary }}
          />

          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative animate-in slide-in-from-right duration-700 aspect-[4/3] md:aspect-auto md:h-[500px]">
            <Slider {...settings}>
              {images.map((src: string, index: number) => (
                <div
                  key={index}
                  className="relative h-full w-full outline-none"
                >
                  {/* Contenedor de imagen con altura fija */}
                  <div className="relative h-[400px] md:h-[500px] w-full overflow-hidden">
                    <Image
                      src={src}
                      alt={`Galería Home ${index}`}
                      fill
                      className="object-cover transform transition-transform duration-[10000ms] scale-100 hover:scale-110 motion-safe:animate-subtle-zoom"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={index === 0}
                    />

                    {/* --- EFECTOS DE CAPAS (OVERLAYS) --- */}

                    {/* 1. Vignette oscura suave para que la foto no brille demasiado */}
                    <div className="absolute inset-0 bg-black/20" />

                    {/* 2. Gradiente inferior para fundir con el fondo de la web */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-transparent to-transparent opacity-90" />

                    {/* 3. Gradiente lateral sutil (opcional, da volumen) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d12]/40 via-transparent to-transparent" />
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </Container>

      {/* Definición de la animación personalizada en JSX styles si no tienes tailwind config a mano */}
      <style jsx global>{`
        @keyframes subtle-zoom {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.1);
          }
        }
        .animate-subtle-zoom {
          animation: subtle-zoom 15s ease-out infinite alternate;
        }
      `}</style>
    </section>
  );
}
