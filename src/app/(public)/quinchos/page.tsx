import { notFound } from "next/navigation";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { supabase } from "@/lib/supabase/supabaseClient";
import { MessageCircle, CheckCircle2, Star, Sparkles } from "lucide-react";
import { ImageCarousel } from "../components/ImageCarousel";

export const revalidate = 0;

export default async function QuinchosPage() {
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white flex items-center justify-center">
        <div className="animate-pulse">Cargando club...</div>
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
        quincho.whatsapp_mensaje || ""
      )}`
    : "#";

  // Asegurar que sea un array para el carrusel
  const images =
    Array.isArray(quincho.galeria) && quincho.galeria.length > 0
      ? quincho.galeria
      : [];

  return (
    <main className="min-h-screen bg-[#0b0d12] text-gray-200 pb-20 pt-32 relative overflow-hidden">
      {/* Fondo Decorativo */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/20 to-[#0b0d12] -z-10" />
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto px-6 max-w-7xl">
        {/* ENCABEZADO */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-blue-300 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Espacio exclusivo para eventos</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-tight">
            {quincho.titulo || "Nuestro Quincho"}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            El lugar ideal para tus reuniones post-partido, cumpleaños y
            celebraciones.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          {/* COLUMNA IZQUIERDA: CARRUSEL (Ocupa 7 columnas) */}
          <div className="lg:col-span-7 w-full h-full min-h-[300px] md:min-h-[450px]">
            <ImageCarousel images={images} title={quincho.titulo} />
          </div>

          {/* COLUMNA DERECHA: INFO (Ocupa 5 columnas) */}
          <div className="lg:col-span-5 space-y-6">
            {/* TARJETA DE PRECIO */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Star size={100} className="text-yellow-500" />
              </div>

              <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">
                Precio
              </h3>
              <div className="flex items-baseline gap-2">
                {quincho.precio ? (
                  <>
                    <span className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-start">
                      <span className="text-2xl text-green-400 mr-1">$</span>
                      {quincho.precio}
                    </span>
                    <span className="text-lg text-gray-500 font-medium">
                      / hora
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-white">
                    Consultar
                  </span>
                )}
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div className="bg-white/5 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                Sobre el espacio
              </h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line text-base">
                {quincho.descripcion ||
                  "Contactanos para más detalles sobre las instalaciones y disponibilidad."}
              </p>

              {/* Features simuladas (puedes hacer esto dinámico después) */}
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Parrilla
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Mesas y
                  Sillas
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Espacio
                  Techado
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> Baños
                </div>
              </div>
            </div>

            {/* BOTÓN DE RESERVA */}
            {quincho.whatsapp_numero && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full bg-green-600 hover:bg-green-500 text-white text-center py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-green-900/30 items-center justify-center gap-3 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <MessageCircle className="w-6 h-6 relative z-10" />
                <span className="relative z-10">Consultar Disponibilidad</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
