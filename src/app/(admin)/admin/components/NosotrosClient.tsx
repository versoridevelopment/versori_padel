"use client";

import Slider from "react-slick";
import Image from "next/image";
import { motion } from "framer-motion";
import { Users, Target, Heart, Trophy, Quote, ArrowRight } from "lucide-react";
import Container from "@/app/(public)/components/ui/Container";
import Link from "next/link";

// Estilos del slider
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface Valor {
  titulo: string;
  contenido: string;
}

interface NosotrosConfig {
  historia_titulo: string;
  hero_descripcion: string;
  historia_contenido: string;
  galeria_pagina: string[];
  valores: Valor[];
  frase_cierre: string;
  equipo_imagen_url?: string;
  recruitment_phone?: string;
  recruitment_message?: string;
}

interface Props {
  config: NosotrosConfig;
}

export default function NosotrosClient({ config }: Props) {
  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 5000,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    pauseOnHover: false,
    customPaging: () => (
      <div className="w-2 h-2 mx-1 rounded-full bg-white/20 hover:bg-white transition-colors" />
    ),
  };

  const images =
    config.galeria_pagina && config.galeria_pagina.length > 0
      ? config.galeria_pagina
      : ["/placeholder-nosotros.jpg"];

  const valores: Valor[] = Array.isArray(config.valores) ? config.valores : [];

  const getIcon = (index: number) => {
    const icons = [Heart, Target, Users, Trophy];
    const Icon = icons[index % icons.length];
    return <Icon className="w-6 h-6 text-blue-400" />;
  };

  return (
    <main className="bg-[#0b0d12] text-white overflow-x-hidden font-sans">
      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-16 md:pt-48 md:pb-24 border-b border-white/5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0b0d12] to-[#0b0d12] -z-10" />

        <Container className="text-center max-w-5xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] md:text-xs font-bold tracking-widest uppercase mb-6">
              Nuestra Esencia
            </span>

            {/* --- CORRECCIÓN DEL TÍTULO --- */}
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1] tracking-tight text-balance break-words hyphens-auto w-full">
              {config.historia_titulo || "Nuestra Historia"}
            </h1>
            {/* ----------------------------- */}

            <p className="text-base sm:text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto text-balance">
              {config.hero_descripcion ||
                "Más que un club, somos una comunidad apasionada por el deporte."}
            </p>
          </motion.div>
        </Container>
      </section>

      {/* 2. HISTORIA & SLIDER */}
      <section className="py-16 md:py-24">
        <Container className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Texto de Historia */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8 order-2 lg:order-1"
          >
            <div>
              <div className="w-12 h-1 bg-blue-600 rounded-full mb-6 md:mb-8" />
              <div className="prose prose-invert prose-lg text-gray-300 whitespace-pre-line leading-relaxed text-base md:text-lg">
                {config.historia_contenido ||
                  "Aquí va la historia detallada del club..."}
              </div>
            </div>

            {/* Frase Destacada */}
            {config.frase_cierre && (
              <div className="p-6 bg-white/5 rounded-2xl border-l-4 border-blue-500 flex gap-4 items-start">
                <Quote className="w-6 h-6 md:w-8 md:h-8 text-blue-500 shrink-0 opacity-50 mt-1" />
                <div>
                  <p className="italic text-base md:text-lg text-white font-medium leading-relaxed">
                    `{config.frase_cierre}`
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Slider de Imágenes */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative order-1 lg:order-2 w-full min-w-0"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2rem] opacity-20 blur-2xl -z-10" />
            <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-slate-900 w-full">
              <Slider {...settings}>
                {images.map((src, index) => (
                  <div
                    key={index}
                    className="relative w-full focus:outline-none"
                  >
                    <div className="relative h-[350px] md:h-[500px] lg:h-[600px] w-full">
                      <Image
                        src={src}
                        alt={`Historia ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={index === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* 3. NUESTROS VALORES */}
      {valores.length > 0 && (
        <section className="py-16 md:py-24 bg-[#08090c] relative">
          <div className="absolute inset-0 bg-[url('/pattern-grid.svg')] opacity-5" />
          <Container>
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-4xl font-bold mb-4 px-4 text-balance">
                Lo que nos define
              </h2>
              <div className="w-24 h-1 bg-white/10 mx-auto rounded-full" />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {valores.map((valor, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  className="bg-white/5 border border-white/5 p-6 md:p-8 rounded-2xl hover:bg-white/10 transition-colors group"
                >
                  <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {getIcon(index)}
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-3 text-white">
                    {valor.titulo}
                  </h3>
                  <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                    {valor.contenido}
                  </p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* 4. SECCIÓN EQUIPO / RECRUITMENT */}
      <section className="py-16 md:py-24 relative overflow-hidden px-4">
        <Container>
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {config.equipo_imagen_url && (
              <div className="absolute inset-0 z-0 opacity-20">
                <Image
                  src={config.equipo_imagen_url}
                  alt="Equipo"
                  fill
                  className="object-cover grayscale"
                />
              </div>
            )}

            <div className="relative z-10 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6 text-white text-balance">
                  Conocé nuestro Equipo
                </h2>
                <p className="text-base md:text-lg text-gray-300 mb-8">
                  Profesionales dedicados a llevar tu juego al siguiente nivel.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/profesores"
                    className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors inline-flex justify-center items-center gap-2 w-full sm:w-auto"
                  >
                    Ver Profesores <ArrowRight size={18} />
                  </Link>

                  {config.recruitment_phone && (
                    <a
                      href={`https://wa.me/${config.recruitment_phone.replace(
                        /\D/g,
                        ""
                      )}?text=${encodeURIComponent(
                        config.recruitment_message ||
                          "Hola, me interesa formar parte del equipo."
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-6 py-3 rounded-xl font-bold hover:bg-blue-600/30 transition-colors text-center w-full sm:w-auto"
                    >
                      Trabajá con nosotros
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
