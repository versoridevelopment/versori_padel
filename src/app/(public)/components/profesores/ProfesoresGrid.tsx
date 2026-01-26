// src/app/(public)/components/profesores/ProfesoresGrid.tsx
"use client";

import ProfesorCard, { Profesor } from "./ProfesorCard";
// Se eliminó el import de framer-motion porque no se usaba

interface Props {
  profesores: Profesor[];
}

export default function ProfesoresGrid({ profesores }: Props) {
  if (!profesores || profesores.length === 0) {
    return (
      <div className="text-center py-20 bg-[#0d1522]/50 rounded-2xl border border-blue-900/20">
        <p className="text-gray-400 text-lg">
          Aún no hay profesores registrados en el equipo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 justify-center">
      {profesores.map((profesor) => (
        <ProfesorCard key={profesor.id_profesor} {...profesor} />
      ))}
    </div>
  );
}