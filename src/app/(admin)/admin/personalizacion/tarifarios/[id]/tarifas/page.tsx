// src/app/(admin)/admin/personalizacion/tarifarios/[id]/tarifas/page.tsx
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import TarifasDeTarifarioClient from "./TarifasDeTarifarioClient";

type PageParams = { id: string };

export default async function TarifasPage({
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

  const idTarifario = Number(id);
  if (Number.isNaN(idTarifario)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        id debe ser numérico
      </div>
    );
  }

  return (
    <TarifasDeTarifarioClient
      clubId={club.id_club}
      clubNombre={club.nombre}
      idTarifario={idTarifario}
    />
  );
}
