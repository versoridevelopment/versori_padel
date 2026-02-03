import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
// Importamos el componente de cliente
import { DesactivarTurnoFijoButton } from "./DesactivarTurnoFijoButton";

type TurnoFijoRow = {
  id_turno_fijo: number;
  id_cancha: number;
  dow: number;
  inicio: string;
  duracion_min: number;
  fin: string;
  fin_dia_offset: 0 | 1;
  activo: boolean;
  segmento: "publico" | "profe";
  tipo_turno: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  start_date: string;
  end_date: string | null;
  future_count?: number;
};

function dowLabel(dow: number) {
  return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][dow] ?? `DOW ${dow}`;
}

async function fetchTurnosFijos(id_club: number) {
  // En Server Components, si usas fetch a tu propia API, 
  // asegúrate de que la URL sea absoluta o usar el mecanismo interno de tu backend.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const res = await fetch(
    `${baseUrl}/api/admin/turnos-fijos?id_club=${id_club}&include_future_count=true`,
    {
      cache: "no-store",
      headers: { cookie: cookies().toString() },
    },
  );

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Error listando turnos fijos");
  return (json?.data || []) as TurnoFijoRow[];
}

export default async function TurnosFijosPage() {
  const club = await getCurrentClub();
  
  if (!club?.id_club) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Turnos fijos</h1>
        <p className="text-sm text-slate-600 mt-2">
          No se pudo resolver el club actual.
        </p>
      </div>
    );
  }

  const id_club = Number(club.id_club);
  const rows = await fetchTurnosFijos(id_club);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Turnos fijos</h1>
          <p className="text-sm text-slate-600">
            Gestioná templates semanales y sus reservas generadas.
          </p>
        </div>

        <Link
          className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-bold hover:bg-slate-800"
          href={`/admin/reservas/nueva`}
        >
          Crear reserva / turno fijo
        </Link>
      </div>

      <div className="grid gap-3">
        {rows.map((tf) => (
          <div
            key={tf.id_turno_fijo}
            className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg border ${
                    tf.activo
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {tf.activo ? "Activo" : "Inactivo"}
                </span>
                <span className="text-xs text-slate-500">
                  {tf.segmento} · {tf.tipo_turno}
                </span>
              </div>

              <div className="mt-2 font-black text-slate-900 truncate">
                {dowLabel(tf.dow)} {tf.inicio} → {tf.fin} ({tf.duracion_min}m)
                {tf.fin_dia_offset ? " (+1)" : ""}
              </div>

              <div className="text-xs text-slate-600 mt-1 truncate">
                Cliente: {tf.cliente_nombre || "—"}{" "}
                {tf.cliente_telefono ? `· ${tf.cliente_telefono}` : ""}
              </div>

              <div className="text-xs text-slate-500 mt-1">
                Vigencia: {tf.start_date}{" "}
                {tf.end_date ? `→ ${tf.end_date}` : "→ sin fin"} · Futuras:{" "}
                <b>{Number(tf.future_count || 0)}</b>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/admin/turnos-fijos/${tf.id_turno_fijo}`}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50"
              >
                Ver reservas
              </Link>

              {tf.activo && (
                <DesactivarTurnoFijoButton
                  idClub={id_club}
                  idTurnoFijo={tf.id_turno_fijo}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No hay turnos fijos creados.
        </div>
      )}
    </div>
  );
}