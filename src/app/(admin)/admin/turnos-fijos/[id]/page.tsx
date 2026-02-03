import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";

type ReservaRow = {
  id_reserva: number;
  fecha: string;
  inicio: string;
  fin: string;
  fin_dia_offset: 0 | 1;
  estado: string;
  precio_total: number;
  segmento: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  created_at: string;
};

type TemplateRow = {
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
};

/**
 * Los Server Components requieren URLs absolutas para fetch.
 */
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

async function fetchTemplate(idTurnoFijo: number, idClub: number) {
  const res = await fetch(
    `${BASE_URL}/api/admin/turnos-fijos/${idTurnoFijo}?id_club=${idClub}`,
    { 
      cache: "no-store", 
      headers: { cookie: cookies().toString() } 
    }
  );
  
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Error leyendo turno fijo");
  return json?.data as TemplateRow;
}

async function fetchReservas(idTurnoFijo: number, idClub: number) {
  const res = await fetch(
    `${BASE_URL}/api/admin/turnos-fijos/${idTurnoFijo}/reservas?id_club=${idClub}`,
    { 
      cache: "no-store", 
      headers: { cookie: cookies().toString() } 
    }
  );
  
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Error listando reservas");
  return (json?.data || []) as ReservaRow[];
}

export default async function TurnoFijoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const id_turno_fijo = Number(id);

  // Obtenemos el club actual mediante la utilidad de subdominio
  const club = await getCurrentClub();
  const id_club = Number(club?.id_club || 0);

  if (!id_turno_fijo || !id_club) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">
          No se pudo resolver el club o el ID del turno fijo. 
          Asegúrate de que el subdominio sea correcto.
        </p>
      </div>
    );
  }

  // Ejecutamos ambas peticiones en paralelo para mayor velocidad
  const [tf, reservas] = await Promise.all([
    fetchTemplate(id_turno_fijo, id_club),
    fetchReservas(id_turno_fijo, id_club),
  ]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href={`/admin/turnos-fijos`}
            className="text-sm font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            ← Volver al listado
          </Link>

          <h1 className="text-2xl font-black text-slate-900 mt-2">
            Turno fijo · {tf.inicio} → {tf.fin} ({tf.duracion_min}m)
            {tf.fin_dia_offset ? " (+1)" : ""}
          </h1>

          <div className="flex flex-wrap gap-2 mt-1 items-center">
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
              tf.activo ? "bg-green-100 text-green-800 border-green-200" : "bg-slate-100 text-slate-700 border-slate-200"
            }`}>
              {tf.activo ? "Activo" : "Inactivo"}
            </span>
            <p className="text-sm text-slate-600">
              {tf.tipo_turno} · {tf.segmento} · Vigencia: {tf.start_date} {tf.end_date ? `→ ${tf.end_date}` : "→ sin fin"}
            </p>
          </div>

          <p className="text-sm text-slate-600 mt-2">
            Cliente: <b>{tf.cliente_nombre || "—"}</b> {tf.cliente_telefono ? `· ${tf.cliente_telefono}` : ""}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="font-black text-slate-900">Historial de reservas generadas</div>
          <div className="text-sm text-slate-600">
            Total: <b>{reservas.length}</b>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {reservas.map((r) => (
            <div
              key={r.id_reserva}
              className="px-4 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-bold text-slate-900">
                  {new Date(r.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} · {r.inicio} → {r.fin}
                  {r.fin_dia_offset ? " (+1)" : ""}
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{r.estado}</span>
                   <span className="text-slate-300">|</span>
                   <span className="text-xs text-slate-600 truncate">
                    {r.cliente_nombre || "—"} {r.cliente_telefono ? `· ${r.cliente_telefono}` : ""}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="font-black text-slate-900">
                  ${Number(r.precio_total || 0).toLocaleString("es-AR")}
                </div>
                <Link
                  href={`/admin/reservas/${r.id_reserva}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2"
                >
                  Ver detalle
                </Link>
              </div>
            </div>
          ))}

          {reservas.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500 italic">
              No se han encontrado reservas asociadas a este turno fijo todavía.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}