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
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
  };

  // Imágenes seguras
  const images =
    config.galeria_inicio && config.galeria_inicio.length > 0
      ? config.galeria_inicio
      : ["/placeholder-nosotros.jpg"];

  return (
    <section className="py-20 bg-[#0b0d12] text-white">
      <Container className="grid md:grid-cols-2 gap-12 items-center">
        {/* Texto */}
        <div className="space-y-6">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10"
            style={{ color: clubColors.primary }}
          >
            Sobre Nosotros
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            {config.historia_titulo || "Nuestra Historia"}
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            {config.hero_descripcion || "Conocé más sobre nuestro club..."}
          </p>
          <Link href="/nosotros">
            <button
              className="mt-4 px-6 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: clubColors.primary }}
            >
              Leer historia completa
            </button>
          </Link>
        </div>

        {/* Slider */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <Slider {...settings}>
            {images.map((src: string, index: number) => (
              <div key={index} className="relative h-[400px] w-full">
                <Image
                  src={src}
                  alt="Nosotros"
                  fill
                  className="object-cover"
                  // CORRECCIÓN: Sizes para slider (aprox 50% de pantalla en desktop)
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ))}
          </Slider>
        </div>
      </Container>
    </section>
  );
}
