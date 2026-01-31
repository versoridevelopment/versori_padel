import Link from "next/link";
import { TrendingUp, Ticket, ChevronRight, User } from "lucide-react";

export function ClientRanking({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-slate-400 text-xs py-8 text-center flex flex-col items-center gap-2">
        <User className="w-8 h-8 opacity-20" />
        Sin datos de clientes en este periodo.
      </div>
    );
  }

  // Helper para decidir la URL correcta
  const getProfileLink = (cliente: any) => {
    // La API del dashboard devuelve IDs tipo "manual-juan" para los manuales
    const isManual = cliente.id && cliente.id.toString().startsWith("manual-");

    if (isManual) {
      // Ruta para usuarios manuales (usamos el nombre)
      return `/admin/usuarios/manuales/${encodeURIComponent(cliente.name)}`;
    }
    // Ruta para usuarios registrados (usamos el ID)
    return `/admin/usuarios/${cliente.id}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {data.map((cliente, index) => (
        <Link
          href={getProfileLink(cliente)}
          key={index}
          className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group cursor-pointer"
        >
          {/* Columna Izquierda: Perfil */}
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                index === 0
                  ? "bg-yellow-50 text-yellow-600 border-yellow-200 group-hover:bg-yellow-100"
                  : "bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-slate-200"
              }`}
            >
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 leading-none group-hover:text-blue-600 transition-colors truncate max-w-[120px]">
                {cliente.name}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <Ticket size={10} className="text-blue-400" />
                <p className="text-[11px] text-slate-500 font-medium">
                  {cliente.reservas} reservas
                </p>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Dinero + Flecha */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">
                ${Number(cliente.gastado).toLocaleString()}
              </p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <TrendingUp size={10} /> Ver perfil
              </div>
            </div>
            <ChevronRight
              size={16}
              className="text-slate-300 group-hover:text-blue-500 transition-colors"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
