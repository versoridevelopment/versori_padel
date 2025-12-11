// src/app/(public)/reserva/page.tsx
import { notFound } from "next/navigation";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import ReservaClient from "./ReservaClient";
import { getCanchasBySubdomain } from "@/lib/canchas/getCanchasBySubdomain";

type CanchaFromApi = {
  id_cancha: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  deporte_nombre: string;
  tipo_nombre: string;
  capacidad_jugadores: number | null;
  precio_hora: number;
  es_exterior: boolean;
};

export default async function ReservaPage() {
  // 1) Club actual según subdominio (multi-tenant)
  const club = await getCurrentClub();
  if (!club) {
    notFound();
  }

  // 2) Obtener canchas usando la misma lógica que la API, pero directo (sin fetch HTTP)
  let apiData: CanchaFromApi[] = [];
  try {
    apiData = (await getCanchasBySubdomain(club.subdominio)) as CanchaFromApi[];
  } catch (err) {
    console.error("[ReservaPage] Error al obtener canchas:", err);
    throw new Error("No se pudieron cargar las canchas.");
  }

  // 3) Mapear al formato que usará el componente cliente
  const canchas = apiData.map((c) => ({
    id: c.id_cancha,
    nombre: c.nombre,
    descripcion:
      c.descripcion ??
      `${c.deporte_nombre.toUpperCase()} · ${c.tipo_nombre}${
        c.capacidad_jugadores
          ? ` · ${c.capacidad_jugadores} jugadores`
          : ""
      }`,
    imagen: c.imagen_url || "/reserva/cancha_interior.jpg",
    slug: `cancha-${c.id_cancha}`,
    deporte: c.deporte_nombre,
    tipo: c.tipo_nombre,
    capacidad: c.capacidad_jugadores,
    precioHora: c.precio_hora,
    esExterior: c.es_exterior,
  }));

  return <ReservaClient club={club} canchas={canchas} />;
}
