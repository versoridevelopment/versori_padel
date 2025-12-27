// src/app/(public)/reserva/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { getCanchasBySubdomain } from "@/lib/canchas/getCanchasBySubdomain";
import ReservaCanchaClient from "./ReservaCanchaClient";

type CanchaFromApi = {
  id_cancha: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  deporte_nombre: string;
  tipo_nombre: string;
  capacidad_jugadores: number | null;
  es_exterior: boolean;
  // NO precio_hora (lo vas a borrar)
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
  const club = await getCurrentClub();
  if (!club) notFound();

  const id_cancha = parseCanchaIdFromSlug(params.slug);
  if (!id_cancha) notFound();

  const apiData = (await getCanchasBySubdomain(club.subdominio)) as CanchaFromApi[];

  const cancha = apiData.find((c) => c.id_cancha === id_cancha);
  if (!cancha) notFound();

  const canchaUI = {
    id_cancha: cancha.id_cancha,
    nombre: cancha.nombre,
    descripcion:
      cancha.descripcion ??
      `${cancha.deporte_nombre.toUpperCase()} · ${cancha.tipo_nombre}${
        cancha.capacidad_jugadores ? ` · ${cancha.capacidad_jugadores} jugadores` : ""
      }`,
    imagen: cancha.imagen_url || "/reserva/cancha_interior.jpg",
    es_exterior: cancha.es_exterior,
  };

  return (
    <ReservaCanchaClient
      clubId={club.id_club}
      clubNombre={club.nombre}
      cancha={canchaUI}
    />
  );
}
