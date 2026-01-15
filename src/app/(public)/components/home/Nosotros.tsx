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
    fade: true,
    infinite: true,
    speed: 1500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 4500,
    pauseOnHover: false,
    // AGREGADO: Asegura que el swipe no sea demasiado sensible
    touchThreshold: 10,
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
    <section className="py-12 md:py-20 bg-[#0b0d12] text-white border-t border-white/5 overflow-hidden">
      <Container className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* --- COLUMNA TEXTO --- */}
        <div className="space-y-6 animate-in slide-in-from-left duration-700 relative z-10 order-1">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 backdrop-blur-sm"
            style={{
              color: clubColors.primary,
              borderColor: `${clubColors.primary}40`,
            }}
          >
            Sobre Nosotros
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight drop-shadow-lg">
            {titulo}
          </h2>

          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-lg">
            {descripcion}
          </p>

          <Link href="/nosotros" className="inline-block">
            <button
              className="mt-2 md:mt-4 px-6 md:px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:scale-105 shadow-lg hover:shadow-xl text-sm md:text-base"
              style={{
                backgroundColor: clubColors.primary,
                boxShadow: `0 10px 30px -10px ${clubColors.primary}60`,
              }}
            >
              Leer historia completa
            </button>
          </Link>
        </div>

        {/* --- COLUMNA SLIDER --- */}
        <div className="relative order-2 mt-4 md:mt-0">
          {/* Elemento decorativo */}
          <div
            className="absolute -inset-4 opacity-30 blur-3xl rounded-full -z-10"
            style={{ backgroundColor: clubColors.primary }}
          />

          {/* SOLUCIÓN: Agregada la clase 'touch-pan-y'. 
             Esto permite que el usuario haga scroll vertical 
             incluso si tiene el dedo sobre el slider.
          */}
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative animate-in slide-in-from-right duration-700 h-[350px] md:h-[500px] w-full touch-pan-y">
            <Slider {...settings}>
              {images.map((src: string, index: number) => (
                <div
                  key={index}
                  className="relative h-full w-full outline-none"
                >
                  <div className="relative h-[350px] md:h-[500px] w-full overflow-hidden">
                    <Image
                      src={src}
                      alt={`Galería Home ${index}`}
                      fill
                      className="object-cover transform transition-transform duration-[10000ms] scale-100 hover:scale-110 motion-safe:animate-subtle-zoom"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={index === 0}
                    />

                    {/* Capas de Efectos */}
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-transparent to-transparent opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d12]/40 via-transparent to-transparent" />
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </Container>

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
        .slick-dots {
          bottom: 15px !important;
        }
        .slick-dots li button:before {
          color: white !important;
          opacity: 0.5 !important;
          font-size: 8px !important;
        }
        .slick-dots li.slick-active button:before {
          opacity: 1 !important;
          color: ${clubColors.primary} !important;
        }
      `}</style>
    </section>
  );
}
