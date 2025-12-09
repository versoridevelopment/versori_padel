"use client";

import Slider from "react-slick";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Container from "../ui/Container";
import { Button } from "../ui/Button";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const images = [
  "/nosotros/1.jpg",
  "/nosotros/2.jpg",
  "/nosotros/3.jpg",
  "/nosotros/4.jpg",
];

export default function SobreNosotros() {
  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 4000,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    pauseOnHover: false,
  };

  return (
    <section
      id="nosotros"
      className="relative w-full min-h-[75vh] flex items-center bg-transparent text-white border-t border-neutral-800"
    >
      <Container className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* 🖼️ Carrusel de imágenes */}
        <motion.div
          className="rounded-5xl overflow-hidden shadow-xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Slider {...settings}>
            {images.map((src, index) => (
              <div key={index} className="relative h-[480px] w-full">
                <Image
                  src={src}
                  alt={`Historia ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </Slider>
        </motion.div>

        {/* 📖 Texto */}
        <motion.div
          className="text-left space-y-6"
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl font-bold text-blue-300">Sobre Nosotros</h2>

          <p className="text-neutral-400 leading-relaxed">
            <span className="text-white font-semibold">Versori Pádel </span>
            surge con la misión de modernizar la forma en que vivimos el
            deporte. Combinamos gestión inteligente, pasión por el pádel y
            tecnología aplicada al rendimiento para crear una experiencia
            completa para clubes, entrenadores y jugadores.
          </p>
          <Link href="/nosotros">
            <Button variant="white" size="lg">
              Seguir leyendo
            </Button>
          </Link>
        </motion.div>
      </Container>
    </section>
  );
}
