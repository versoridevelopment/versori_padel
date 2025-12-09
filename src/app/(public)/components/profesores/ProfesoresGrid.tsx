"use client";

import ProfesorCard from "./ProfesorCard";

const profesores = [
  {
    nombre: "Raul Acosta",
    telefono: "+54 9 379 4444444",
    instagram: "@raul_acosta13131",
    imagen: "/profesores/profesor1.webp",
  },
  {
    nombre: "Facundo Gimenez",
    telefono: "+54 9 379 42312312",
    instagram: "@facundo_gimenez31",
    imagen: "/profesores/profesor2.webp",
  },
];

export default function ProfesoresGrid() {
  return (
    <div className="grid md:grid-cols-2 gap-10">
      {profesores.map((profesor, index) => (
        <ProfesorCard key={index} {...profesor} />
      ))}
    </div>
  );
}
