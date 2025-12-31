"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "../ui/Container";

export default function Profesores({ profesores }: { profesores: any[] }) {
  if (!profesores || profesores.length === 0) return null;

  // Mostramos máximo 4 en el home para no saturar
  const displayProfesores = profesores.slice(0, 4);

  return (
    <section className="py-24 bg-[#08090c] border-t border-white/5">
      <Container>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Nuestro Equipo
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Contamos con profesionales dedicados a potenciar tu juego en cada
            entrenamiento.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayProfesores.map((profe) => (
            <div
              // CORRECCIÓN 1: Usamos 'id_profesor' en lugar de 'id'
              key={profe.id_profesor}
              className="bg-[#12141a] rounded-2xl overflow-hidden border border-white/5 group hover:border-white/20 transition-all duration-300 hover:-translate-y-2 shadow-lg hover:shadow-blue-900/10"
            >
              <div className="relative h-72 w-full bg-gray-800">
                {profe.foto_url ? (
                  <Image
                    src={profe.foto_url}
                    alt={profe.nombre}
                    fill
                    // CORRECCIÓN 2: Propiedad sizes para optimización
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 bg-gray-900">
                    <span className="text-xs uppercase tracking-widest">
                      Sin foto
                    </span>
                  </div>
                )}
                {/* Overlay gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12141a] via-transparent to-transparent opacity-80" />
              </div>

              <div className="p-6 relative -mt-12 text-center">
                <h3 className="text-xl font-bold text-white mb-1">
                  {profe.nombre} {profe.apellido}
                </h3>
                <p className="text-sm font-medium text-blue-400 uppercase tracking-wider">
                  {profe.rol || "Entrenador"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* --- BOTÓN CTA --- */}
        <div className="mt-16 text-center">
          <Link href="/profesores">
            <button className="group inline-flex items-center gap-2 px-8 py-4 bg-transparent border border-white/20 hover:border-white text-white rounded-full font-bold transition-all hover:bg-white hover:text-black">
              Conocé al equipo completo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </Container>
    </section>
  );
}
