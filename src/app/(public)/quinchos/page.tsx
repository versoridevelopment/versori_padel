import { notFound } from "next/navigation";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  MessageCircle,
  Check,
  Sparkles,
  MapPin,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { ImageCarousel } from "@/components/ImageCarousel";

export const revalidate = 0;

export default async function QuinchosPage() {
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <p className="text-sm font-light tracking-widest uppercase">
            Cargando experiencia...
          </p>
        </div>
      </div>
    );
  }

  const { data: quincho } = await supabase
    .from("quinchos")
    .select("*")
    .eq("id_club", club.id_club)
    .maybeSingle();

  if (!quincho || !quincho.activo) {
    return notFound();
  }

  const whatsappLink = quincho.whatsapp_numero
    ? `https://wa.me/${quincho.whatsapp_numero}?text=${encodeURIComponent(
        quincho.whatsapp_mensaje || "Hola, quisiera consultar disponibilidad.",
      )}`
    : "#";

  const images =
    Array.isArray(quincho.galeria) && quincho.galeria.length > 0
      ? quincho.galeria
      : [];

  // Lógica estricta: Si es 0, "0", null o undefined, NO mostramos la tarjeta
  const hasPrice = quincho.precio && String(quincho.precio) !== "0";

  return (
    <main className="min-h-screen bg-[#09090b] text-gray-100 pb-24 pt-36 relative overflow-x-hidden selection:bg-indigo-500/30">
      {/* --- FONDOS AMBIENTALES --- */}
      <div className="fixed top-0 left-0 w-full h-[800px] bg-gradient-to-b from-indigo-900/20 via-[#09090b] to-[#09090b] -z-20 pointer-events-none" />
      <div className="fixed -top-40 -right-40 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-screen" />
      <div className="fixed top-40 -left-20 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* --- ENCABEZADO --- */}
        <div className="text-center mb-16 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-indigo-300 uppercase backdrop-blur-md shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-3.5 h-3.5" />
            Eventos y Reuniones
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[0.9]">
            {quincho.titulo || "Espacio Exclusivo"}
          </h1>

          <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed">
            Un ambiente diseñado para disfrutar. Celebra tus momentos especiales
            en nuestras instalaciones.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* --- COLUMNA IZQUIERDA: CARRUSEL --- */}
          <div className="lg:col-span-7 w-full animate-in fade-in slide-in-from-left-8 duration-1000 delay-100">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900/50 relative group">
              {/* Efecto de brillo en borde al hover */}
              <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/10 transition-colors duration-500 rounded-3xl pointer-events-none z-20" />
              <ImageCarousel images={images} title={quincho.titulo} />
            </div>

            {/* Info Extra debajo del carrusel (Opcional) */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center lg:justify-start opacity-70">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <CalendarClock className="w-4 h-4 text-indigo-400" />{" "}
                Disponibilidad todo el año
              </div>
            </div>
          </div>

          {/* --- COLUMNA DERECHA: INFO --- */}
          <div className="lg:col-span-5 flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
            {/* 1. TARJETA DE PRECIO (CONDICIONAL) */}
            {hasPrice && (
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-white/10 rounded-3xl p-8 shadow-xl backdrop-blur-xl relative overflow-hidden group">
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-all duration-500" />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">
                      Precio
                    </h3>
                    <div className="bg-indigo-500/20 text-indigo-300 p-2 rounded-lg">
                      <DollarSignIcon />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-black text-white tracking-tighter">
                      ${quincho.precio}
                    </span>
                    <span className="text-lg text-gray-500 font-medium">
                      / hora
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">
                    * Precios sujetos a modificaciones sin previo aviso.
                  </p>
                </div>
              </div>
            )}

            {/* 2. DESCRIPCIÓN & FEATURES */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-md hover:bg-white/[0.05] transition-colors duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Detalles del espacio
                </h3>
              </div>

              <div className="text-gray-300 leading-relaxed whitespace-pre-line text-[15px] font-light opacity-90 mb-8">
                {quincho.descripcion ||
                  "Un espacio pensado para tu comodidad. Contactanos para conocer más detalles sobre el equipamiento y las posibilidades que ofrece nuestro salón."}
              </div>

              {/* Grid de características mejorado */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Parrilla Completa",
                  "Mesas y Sillas",
                  "Ambiente Climatizado",
                  "Baños Exclusivos",
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition-colors group"
                  >
                    <div className="h-2 w-2 rounded-full bg-indigo-500 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.8)] transition-shadow" />
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. CTA WHATSAPP */}
            {quincho.whatsapp_numero && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-full overflow-hidden rounded-2xl bg-indigo-600 p-1 transition-transform active:scale-[0.98] shadow-lg shadow-indigo-900/40 hover:shadow-indigo-600/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative flex items-center justify-center gap-3 bg-[#0b0d12] hover:bg-transparent text-white py-4 rounded-xl transition-colors duration-300 h-full w-full group-hover:bg-opacity-10">
                  <MessageCircle className="w-6 h-6 group-hover:animate-bounce" />
                  <span className="font-bold text-lg tracking-wide">
                    Consultar Disponibilidad
                  </span>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// Icono simple SVG para el precio
function DollarSignIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
