// src/app/(admin)/admin/personalizacion/canchas/[id]/page.tsx
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import EditarCanchaClient from "./EditarCanchaClient";

type PageParams = { id: string };

export default async function EditarCanchaPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params; // ✅ Next 15: params es Promise
  const club = await getCurrentClub();

  if (!club) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-rose-700">
        No se pudo detectar el club actual por subdominio.
      </div>
    );
  }

  return (
    <EditarCanchaClient
      clubId={club.id_club}
      clubNombre={club.nombre}
      idCancha={Number(id)}
    />
  );
}
