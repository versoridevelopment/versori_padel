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
};

type PageParams = { slug: string };

function parseCanchaIdFromSlug(slug: string) {
  const m = /^cancha-(\d+)$/.exec(slug);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isNaN(id) ? null : id;
}

export default async function ReservaCanchaPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params; // ✅ Next 15: params es Promise

  // 1) Club
  const club = await getCurrentClub();
  if (!club) notFound();

  // 2) Parsear ID
  const id_cancha = parseCanchaIdFromSlug(slug);
  if (!id_cancha) notFound();

  // 3) Buscar cancha
  const apiData = (await getCanchasBySubdomain(club.subdominio)) as CanchaFromApi[];
  const cancha = apiData.find((c) => c.id_cancha === id_cancha);
  if (!cancha) notFound();

  // 4) Mapear UI
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

  // 5) Render
  return <ReservaCanchaClient club={club} cancha={canchaUI} />;
}
