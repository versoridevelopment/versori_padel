"use client";

import Slider from "react-slick";
import Image from "next/image";
import { motion } from "framer-motion";
import { Users, Target, Heart, Trophy, Quote, ArrowRight } from "lucide-react";
import Container from "@/app/(public)/components/ui/Container";
import Link from "next/link";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// 1. DEFINIMOS LOS TIPOS AQUÍ PARA QUE COINCIDAN CON LA BD
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

// 2. DEFINIMOS LA INTERFACE PROPS ESPERANDO "config"
interface Props {
  config: NosotrosConfig;
}

export default function NosotrosClient({ config }: Props) {
  // Configuración del Slider
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

  // Imágenes seguras (fallback si está vacío)
  const images =
    config.galeria_pagina && config.galeria_pagina.length > 0
      ? config.galeria_pagina
      : ["/placeholder-nosotros.jpg"];

  // Valores seguros (si viene null de la BD, usamos array vacío)
  const valores: Valor[] = Array.isArray(config.valores) ? config.valores : [];

  // Función para asignar iconos a los valores
  const getIcon = (index: number) => {
    const icons = [Heart, Target, Users, Trophy];
    const Icon = icons[index % icons.length];
    return <Icon className="w-6 h-6 text-blue-400" />;
  };

  return (
    <main className="bg-[#0b0d12] text-white overflow-hidden">
      {/* 1. HERO SECTION (Título + Resumen) */}
      <section className="relative pt-40 pb-20 border-b border-white/5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0b0d12] to-[#0b0d12] -z-10" />
        <Container className="text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">
              Nuestra Esencia
            </span>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              {config.historia_titulo || "Nuestra Historia"}
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              {config.hero_descripcion ||
                "Más que un club, somos una comunidad apasionada por el deporte."}
            </p>
          </motion.div>
        </Container>
      </section>

      {/* 2. HISTORIA & SLIDER */}
      <section className="py-24">
        <Container className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Texto de Historia */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="w-12 h-1 bg-blue-600 rounded-full mb-8" />
            <div className="prose prose-invert prose-lg text-gray-300 whitespace-pre-line leading-relaxed">
              {config.historia_contenido ||
                "Aquí va la historia detallada del club..."}
            </div>

            {/* Frase Destacada (Quote) */}
            {config.frase_cierre && (
              <div className="mt-8 p-6 bg-white/5 rounded-2xl border-l-4 border-blue-500 flex gap-4">
                <Quote className="w-8 h-8 text-blue-500 shrink-0 opacity-50" />
                <p className="italic text-lg text-white font-medium">
                  `{config.frase_cierre}`
                </p>
              </div>
            )}
          </motion.div>

          {/* Slider de Imágenes */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2rem] opacity-20 blur-2xl -z-10" />
            <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-slate-900">
              <Slider {...settings}>
                {images.map((src, index) => (
                  <div
                    key={index}
                    className="relative h-[600px] w-full focus:outline-none"
                  >
                    <Image
                      src={src}
                      alt={`Historia ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                ))}
              </Slider>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* 3. NUESTROS VALORES (Grid) */}
      {valores.length > 0 && (
        <section className="py-24 bg-[#08090c] relative">
          <div className="absolute inset-0 bg-[url('/pattern-grid.svg')] opacity-5" />
          <Container>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Lo que nos define
              </h2>
              <div className="w-24 h-1 bg-white/10 mx-auto rounded-full" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {valores.map((valor, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  className="bg-white/5 border border-white/5 p-8 rounded-2xl hover:bg-white/10 transition-colors group"
                >
                  <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {getIcon(index)}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">
                    {valor.titulo}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {valor.contenido}
                  </p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* 4. SECCIÓN EQUIPO / RECRUITMENT */}
      <section className="py-24 relative overflow-hidden">
        <Container>
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {/* Background Image Overlay */}
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

            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                  Conocé nuestro Equipo
                </h2>
                <p className="text-lg text-gray-300 mb-8"></p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/profesores"
                    className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
                  >
                    Ver Profesores <ArrowRight size={18} />
                  </Link>
                  {config.recruitment_phone && (
                    <a
                      href={`https://wa.me/${
                        config.recruitment_phone
                      }?text=${encodeURIComponent(
                        config.recruitment_message ||
                          "Hola, me interesa formar parte del equipo."
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-8 py-3 rounded-xl font-bold hover:bg-blue-600/30 transition-colors"
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
