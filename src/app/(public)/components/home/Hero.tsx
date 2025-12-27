"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "../ui/Container";
import { Club } from "@/lib/ObetenerClubUtils/getCurrentClub"; // Asegúrate de importar el tipo Club

interface HeroProps {
  clubData: any;
  titulo: string;
  subtitulo: string;
}

const Hero = ({ clubData, titulo, subtitulo }: HeroProps) => {
  // Valores por defecto por si acaso (aunque el layout debería manejar esto)
  const heroUrl = clubData?.imagen_hero_url;
  const primaryColor = clubData?.color_primario || "#3b82f6"; // Azul default
  const secondaryColor = clubData?.color_secundario || "#8b5cf6"; // Violeta default

  const isVideo = heroUrl?.match(/\.(mp4|webm|mov)$/i);

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden flex items-center">
      {/* --- FONDO (Imagen o Video) --- */}
      <div className="absolute inset-0 z-0">
        {heroUrl ? (
          isVideo ? (
            <video
              src={heroUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={heroUrl}
              alt="Portada del club"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          )
        ) : (
          // Fallback si no hay imagen cargada
          <div className="w-full h-full bg-neutral-900" />
        )}
      </div>

      {/* --- CAPA 1: Oscurecimiento Base (Para legibilidad del texto) --- */}
      <div className="absolute inset-0 bg-black/50 z-[1]" />

      {/* --- CAPA 2: GRADIENTE ESTÉTICO SUTIL (NUEVO) --- */}
      {/* Usamos estilos en línea para aplicar los colores dinámicos.
          Se aplica una opacidad baja (opacity-40) y un mix-blend-mode 
          para que el color "tiña" la imagen de forma agradable.
      */}
      <div
        className="absolute inset-0 z-[2] opacity-40 mix-blend-overlay pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      />
      {/* Opcional: Una segunda capa de gradiente para más profundidad */}
      <div
        className="absolute inset-0 z-[2] opacity-20 mix-blend-color pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent, ${secondaryColor})`,
        }}
      />

      {/* --- CONTENIDO DEL HERO --- */}
      <Container className="relative z-10">
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Título con el color primario como acento */}
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
            <span
              className="block text-[0.6em] md:text-[0.5em] font-bold uppercase tracking-widest mb-2 opacity-90"
              style={{ color: primaryColor }}
            >
              Bienvenido a
            </span>
            {titulo || "TU CLUB DE PÁDEL"}
          </h1>

          <p className="text-xl md:text-2xl text-gray-200 font-medium max-w-xl drop-shadow-md leading-relaxed">
            {subtitulo ||
              "El mejor lugar para disfrutar del deporte que te apasiona."}
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            {/* Botón Principal usando el color primario */}
            <Link href="/reserva">
              <button
                className="px-8 py-4 rounded-xl font-bold text-white flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-black/20"
                style={{ backgroundColor: primaryColor }}
              >
                Reservar Cancha <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/nosotros">
              <button className="px-8 py-4 rounded-xl font-bold text-white border-2 border-white/30 hover:bg-white/10 transition-colors backdrop-blur-sm">
                Conocé el Club
              </button>
            </Link>
          </div>
        </div>
      </Container>

      {/* Decoración inferior sutil */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0b0d12] to-transparent z-[3]" />
    </section>
  );
};

export default Hero;
