"use client";

import {
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Exportamos el componente directamente (puede llamarse RecentBookings o BookingTable según como lo importes)
export function BookingTable({ data }: { data: any[] }) {
  const router = useRouter();

  if (!data || data.length === 0)
    return (
      <div className="text-slate-400 p-8 text-center text-sm flex flex-col items-center gap-2">
        <Calendar className="w-8 h-8 opacity-20" />
        No hay reservas próximas agendadas.
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 font-semibold">Cliente</th>
            <th className="px-6 py-4 font-semibold">Cancha</th>
            <th className="px-6 py-4 font-semibold">Fecha</th>
            <th className="px-6 py-4 font-semibold">Precio</th>
            <th className="px-6 py-4 font-semibold">Estado</th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((reserva) => (
            <tr
              key={reserva.id_reserva}
              onClick={() => router.push("/admin/reservas")} // ✅ Navega a la agenda
              className="hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                    {reserva.cliente}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                    {reserva.email}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-slate-600 font-medium">
                    {reserva.canchas?.nombre}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4 text-slate-500">
                <div className="flex flex-col text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar size={12} className="text-slate-400" />
                    {/* Formateamos un poco la fecha si viene cruda */}
                    {new Date(reserva.fecha + "T00:00:00").toLocaleDateString(
                      "es-AR",
                      { day: "numeric", month: "short" },
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono mt-1 text-slate-400">
                    <Clock size={12} /> {reserva.inicio?.slice(0, 5)} -{" "}
                    {reserva.fin?.slice(0, 5)}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4 font-black text-slate-700">
                ${Number(reserva.precio_total).toLocaleString()}
              </td>

              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-700 border border-green-100">
                  <CheckCircle2 size={10} /> Confirmada
                </span>
              </td>

              <td className="px-6 py-4 text-right">
                <button
                  aria-label="Ver detalles"
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-300 hover:text-blue-600 transition-colors"
                >
                  <ArrowRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
