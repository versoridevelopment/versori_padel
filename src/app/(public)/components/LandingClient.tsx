"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Trophy,
} from "lucide-react";
import ProfesorCard, { Profesor } from "./profesores/ProfesorCard";

// Helper para detectar si la URL es video
const isVideo = (url: string) => url?.match(/\.(mp4|webm|mov)$/i);

export interface LandingProps {
  club: {
    nombre: string;
    subdominio: string;
    color_primario: string;
    color_secundario: string;
    logo_url?: string;
    imagen_hero_url?: string;
    texto_titulo?: string;
    texto_subtitulo?: string;
    marcas: { id: string; tipo: "imagen" | "texto"; valor: string }[];
  };
  nosotros: any;
  profesores: Profesor[];
  contacto: any;
}

export default function LandingClient({
  club,
  nosotros,
  profesores,
  contacto,
}: LandingProps) {
  // 1. DEFINIR DATOS SEGUROS PARA "NOSOTROS"
  // Si 'nosotros' es null (no cargaste nada en admin), usamos este objeto por defecto para que la sección NO desaparezca.
  const safeNosotros = nosotros || {
    historia_titulo: "Bienvenido a " + club.nombre,
    // Texto de relleno para visualizar el diseño
    historia_contenido:
      "Todavía no se ha cargado la historia del club. Ve al panel de administración > Sobre Nosotros para completar esta información y contarle a tus clientes sobre tu pasión por el pádel. Esta sección es ideal para generar confianza.",
    galeria_inicio: [], // Usaremos la imagen del hero como fallback en el slider
    frase_cierre: "Pasión por el deporte",
    valores: [
      { titulo: "Comunidad", contenido: "Fomentamos el deporte y la amistad." },
      { titulo: "Calidad", contenido: "Canchas de primer nivel." },
      { titulo: "Pasión", contenido: "Vivimos el pádel día a día." },
    ],
  };

  // Lógica segura para extraer datos de contacto
  const telefonoPrincipal =
    contacto?.telefonos && contacto.telefonos.length > 0
      ? contacto.telefonos[0].numero
      : null;

  const direccionPrincipal =
    contacto?.direcciones && contacto.direcciones.length > 0
      ? contacto.direcciones[0]
      : null;

  const direccionTexto = direccionPrincipal
    ? `${direccionPrincipal.calle || ""} ${
        direccionPrincipal.altura_calle || ""
      }, ${direccionPrincipal.barrio || ""}`
    : null;

  const leyendaHero =
    club.texto_subtitulo || "El mejor lugar para vivir el pádel.";

  return (
    <main className="min-h-screen bg-[#0b0d12] text-gray-200 overflow-x-hidden">
      {/* ================= HERO SECTION ================= */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Fondo (Video o Imagen) */}
        <div className="absolute inset-0 z-0">
          {club.imagen_hero_url ? (
            isVideo(club.imagen_hero_url) ? (
              <video
                src={club.imagen_hero_url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={club.imagen_hero_url}
                alt="Portada"
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            )
          ) : (
            // Fallback si no hay imagen
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-[#0b0d12] to-[#0b0d12]" />
          )}
          {/* Overlay oscuro */}
          <div className="absolute inset-0 bg-black/60 z-10" />
        </div>

        {/* Contenido Hero */}
        <div className="container mx-auto px-6 relative z-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo o Nombre */}
            {club.logo_url ? (
              <div className="relative w-40 h-40 md:w-60 md:h-60 mx-auto mb-8">
                <Image
                  src={club.logo_url}
                  alt={club.nombre}
                  fill
                  className="object-contain drop-shadow-2xl"
                  sizes="(max-width: 768px) 160px, 240px"
                />
              </div>
            ) : (
              <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
                {club.nombre.toUpperCase()}
              </h1>
            )}

            {/* Textos Editables */}
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 drop-shadow-md">
              {club.texto_titulo || "EL MEJOR LUGAR PARA VIVIR EL PÁDEL"}
            </h2>
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-md">
              {leyendaHero}
            </p>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/reserva">
                <button
                  className="px-8 py-4 text-white rounded-xl font-bold text-lg transition-all shadow-lg flex items-center gap-2 mx-auto hover:brightness-110 hover:-translate-y-1"
                  style={{ backgroundColor: club.color_primario }}
                >
                  Reservar Cancha <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= CARRUSEL DE MARCAS (INFINITO) ================= */}
      {club.marcas && club.marcas.length > 0 && (
        <section className="py-5 bg-[#050608] border-y border-gray-900 overflow-hidden select-none relative z-20">
          {/* Contenedor Flex para el loop infinito (2 listas idénticas) */}
          <div className="flex overflow-hidden group w-full">
            {/* LISTA 1 */}
            <div className="flex shrink-0 animate-marquee items-center justify-around gap-24 pr-24 min-w-full group-hover:[animation-play-state:paused]">
              {club.marcas.map((marca, i) => (
                <BrandItem key={`brand-1-${i}`} marca={marca} />
              ))}
            </div>

            {/* LISTA 2 (Clon para el efecto infinito) */}
            <div
              aria-hidden="true"
              className="flex shrink-0 animate-marquee items-center justify-around gap-24 pr-24 min-w-full group-hover:[animation-play-state:paused]"
            >
              {club.marcas.map((marca, i) => (
                <BrandItem key={`brand-2-${i}`} marca={marca} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= SECCIÓN NOSOTROS (AHORA SIEMPRE VISIBLE) ================= */}
      {/* Eliminamos el chequeo estricto {nosotros && ...} y usamos safeNosotros */}
      <section
        id="nosotros"
        className="py-24 overflow-hidden relative"
        style={{ backgroundColor: club.color_secundario }}
      >
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* --- Columna Izquierda: Texto Resumido --- */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div
                className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest uppercase"
                style={{ color: club.color_primario }}
              >
                Sobre Nosotros
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                {safeNosotros.historia_titulo}
              </h2>

              <p className="text-lg text-gray-400 leading-relaxed line-clamp-4">
                {safeNosotros.hero_descripcion ||
                  safeNosotros.historia_contenido}
              </p>

              <div className="pt-4">
                <Link href="/nosotros">
                  <button className="group flex items-center gap-3 text-white font-semibold hover:text-gray-300 transition-colors">
                    <span className="border-b-2 border-transparent group-hover:border-white transition-all pb-0.5">
                      Conoce nuestra historia completa
                    </span>
                    <ArrowRight
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      style={{ color: club.color_primario }}
                    />
                  </button>
                </Link>
              </div>
            </motion.div>

            {/* --- Columna Derecha: Slider Elegante --- */}
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50">
              <ElegantSlider
                // Si no hay galería, usamos imagen de historia, o imagen de hero, o placeholder
                images={
                  safeNosotros.galeria_inicio?.length > 0
                    ? safeNosotros.galeria_inicio
                    : [safeNosotros.historia_imagen_url || club.imagen_hero_url]
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROFESORES ================= */}
      {profesores.length > 0 && (
        <section className="py-24 relative bg-gradient-to-b from-[#0b0d12] to-[#0e1a2b]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white">Nuestro Equipo</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 justify-center">
              {profesores.slice(0, 3).map((p) => (
                <ProfesorCard key={p.id_profesor} {...p} />
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/profesores">
                <button className="px-8 py-3 rounded-full border border-gray-700 text-white hover:bg-white hover:text-black transition-all font-medium">
                  Ver todo el equipo
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================= FOOTER ================= */}
      <footer
        className="pt-20 pb-10 border-t border-gray-800"
        style={{ backgroundColor: club.color_secundario }}
      >
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            {/* Branding */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">
                {club.nombre}
              </h3>
              <p className="text-gray-500">{safeNosotros.frase_cierre}</p>
            </div>

            {/* Navegación */}
            <div>
              <h4 className="text-white font-semibold mb-6">Navegación</h4>
              <ul className="space-y-4 text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profesores"
                    className="hover:text-white transition-colors"
                  >
                    Profesores
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contacto */}
            <div>
              <h4 className="text-white font-semibold mb-6">Contacto</h4>
              <ul className="space-y-4 text-gray-400">
                {direccionTexto && (
                  <li className="flex gap-3">
                    <MapPin
                      className="w-5 h-5 shrink-0"
                      style={{ color: club.color_primario }}
                    />
                    <span>{direccionTexto}</span>
                  </li>
                )}
                {telefonoPrincipal && (
                  <li className="flex gap-3">
                    <Phone
                      className="w-5 h-5 shrink-0"
                      style={{ color: club.color_primario }}
                    />
                    <span>{telefonoPrincipal}</span>
                  </li>
                )}
                {contacto?.email && (
                  <li className="flex gap-3">
                    <Mail
                      className="w-5 h-5 shrink-0"
                      style={{ color: club.color_primario }}
                    />
                    <span>{contacto.email}</span>
                  </li>
                )}
                {contacto?.usuario_instagram && (
                  <li className="flex gap-3">
                    <Instagram className="w-5 h-5 shrink-0 text-pink-500" />
                    <a
                      href={`https://instagram.com/${contacto.usuario_instagram.replace(
                        "@",
                        ""
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {contacto.usuario_instagram}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-600 text-sm">
            © {new Date().getFullYear()} {club.nombre}. Powered by Versori.
          </div>
        </div>
      </footer>
    </main>
  );
}

// =====================================================================
// COMPONENTE: SLIDER ELEGANTE (FADE AUTOMÁTICO)
// =====================================================================
const ElegantSlider = ({ images }: { images: string[] }) => {
  // Aseguramos que sea un array válido. Si falla, placeholder.
  const validImages = Array.isArray(images) && images.length > 0 ? images : [];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play
  useEffect(() => {
    if (validImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(timer);
  }, [validImages.length]);

  // Si no hay imágenes válidas, mostramos un div vacío o un placeholder simple
  if (validImages.length === 0)
    return <div className="w-full h-full bg-gray-800" />;

  return (
    <div className="relative w-full h-full bg-gray-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {validImages[currentIndex] && (
            <Image
              src={validImages[currentIndex]}
              alt={`Slide ${currentIndex}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {validImages.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-10">
          {validImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Ir a imagen ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =====================================================================
// COMPONENTE AUXILIAR PARA CADA MARCA (TEXTO O IMAGEN)
// =====================================================================
const BrandItem = ({
  marca,
}: {
  marca: { tipo: "imagen" | "texto"; valor: string };
}) => {
  return (
    <div className="flex items-center justify-center">
      {marca.tipo === "imagen" && marca.valor ? (
        // --- RENDERIZADO DE IMAGEN (Logo) ---
        <div className="opacity-85 hover:opacity-100 relative w-48 h-24 md:w-40 md:h-20 transition-transform duration-300 hover:scale-105">
          <Image
            src={marca.valor}
            alt="Marca"
            fill
            className="object-contain drop-shadow-lg"
            sizes="(max-width: 768px) 192px, 240px"
          />
        </div>
      ) : (
        // --- RENDERIZADO DE TEXTO ---
        <span className="text-3xl md:text-5xl font-black text-gray-300 hover:text-white transition-colors uppercase cursor-default whitespace-nowrap drop-shadow-md tracking-wider">
          {marca.valor}
        </span>
      )}
    </div>
  );
};
