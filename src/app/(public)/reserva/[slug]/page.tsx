// src/app/(public)/reserva/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { getCanchasBySubdomain } from "@/lib/canchas/getCanchasBySubdomain";
import ReservaCanchaClient from "./ReservaCanchaClient";

// Definimos el tipo localmente para machear lo que viene de tu API
type CanchaFromApi = {
  id_cancha: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  deporte_nombre: string;
  tipo_nombre: string;
  capacidad_jugadores: number | null;
  es_exterior: boolean;
};

function parseCanchaIdFromSlug(slug: string) {
  // slug esperado: cancha-123
  const m = /^cancha-(\d+)$/.exec(slug);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isNaN(id) ? null : id;
}

export default async function ReservaCanchaPage({
  params,
}: {
  params: { slug: string };
}) {
  // 1. Obtener datos del Club (incluye colores, logo, etc.)
  const club = await getCurrentClub();
  if (!club) notFound();

  // 2. Parsear ID de la URL
  const id_cancha = parseCanchaIdFromSlug(params.slug);
  if (!id_cancha) notFound();

  // 3. Buscar la cancha (respetando tu lógica actual)
  const apiData = (await getCanchasBySubdomain(club.subdominio)) as CanchaFromApi[];
  const cancha = apiData.find((c) => c.id_cancha === id_cancha);
  
  if (!cancha) notFound();

  // 4. Mapear datos para la UI del cliente
  const canchaUI = {
    id_cancha: cancha.id_cancha,
    nombre: cancha.nombre,
    descripcion:
      cancha.descripcion ??
      `${cancha.deporte_nombre.toUpperCase()} · ${cancha.tipo_nombre}${
        cancha.capacidad_jugadores ? ` · ${cancha.capacidad_jugadores} jugadores` : ""
      }`,
    // Fallback de imagen si viene null
    imagen: cancha.imagen_url || "/reserva/cancha_interior.jpg", 
    es_exterior: cancha.es_exterior,
  };

  // 5. Renderizar Cliente pasando el CLUB COMPLETO
  return (
    <ReservaCanchaClient
      club={club}      // ✅ CAMBIO CLAVE: Pasamos todo el objeto club
      cancha={canchaUI}
    />
  );
}