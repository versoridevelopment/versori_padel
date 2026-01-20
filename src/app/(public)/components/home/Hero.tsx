"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react"; // Importamos el icono
import Container from "../ui/Container";

interface HeroProps {
  clubData: any;
  titulo: string;
  subtitulo: string;
  whatsappNumber?: string | null; // Nuevo campo
  showWhatsapp?: boolean; // Nuevo campo (toggle)
}

const Hero = ({
  clubData,
  titulo,
  subtitulo,
  whatsappNumber,
  showWhatsapp,
}: HeroProps) => {
  const heroUrl = clubData?.imagen_hero_url;
  const primaryColor = clubData?.color_primario || "#3b82f6";
  const secondaryColor = clubData?.color_secundario || "#8b5cf6";

  const isVideo = heroUrl?.match(/\.(mp4|webm|mov)$/i);

  // Lógica para el link de WhatsApp
  const cleanNumber = whatsappNumber?.replace(/\D/g, ""); // Quitamos espacios/guiones
  const whatsappLink = cleanNumber
    ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
        "Hola! Quisiera hacer una consulta.",
      )}`
    : "#";

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden flex items-center">
      {/* --- FONDO --- */}
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
          <div className="w-full h-full bg-neutral-900" />
        )}
      </div>

      {/* --- CAPAS DE COLOR --- */}
      <div className="absolute inset-0 bg-black/50 z-[1]" />
      <div
        className="absolute inset-0 z-[2] opacity-40 mix-blend-overlay pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        }}
      />
      <div
        className="absolute inset-0 z-[2] opacity-20 mix-blend-color pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent, ${secondaryColor})`,
        }}
      />

      {/* --- CONTENIDO --- */}
      <Container className="relative z-10">
        <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
            {titulo || "TU CLUB DE PÁDEL"}
          </h1>

          <p className="text-xl md:text-2xl text-gray-200 font-medium max-w-xl drop-shadow-md leading-relaxed">
            {subtitulo ||
              "El mejor lugar para disfrutar del deporte que te apasiona."}
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            {/* 1. Botón Reservar */}
            <Link href="/reserva">
              <button
                className="px-8 py-4 rounded-xl font-bold text-white flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-black/20"
                style={{ backgroundColor: primaryColor }}
              >
                Reservar Cancha <ArrowRight className="w-5 h-5" />
              </button>
            </Link>

            {/* 2. Botón WhatsApp (Nuevo) */}
            {/* Se renderiza solo si está activo y existe un número */}
            {showWhatsapp && cleanNumber && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl font-bold text-white flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-green-900/20 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </Container>

      {/* Decoración inferior */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0b0d12] to-transparent z-[3]" />
    </section>
  );
};

export default Hero;
