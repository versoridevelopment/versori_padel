"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  Filter,
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  X,
  Loader2,
  Clock,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";

// --- TIPOS ---
type MPStatus =
  | "approved"
  | "pending"
  | "in_process"
  | "rejected"
  | "refunded"
  | "created";

type PagoRow = {
  id_pago: number;
  mp_payment_id: string | null; // Puede venir nulo
  monto: number;
  estado: MPStatus;
  fecha: string;
  cliente: {
    nombre: string | null;
    apellido: string | null;
    email: string | null;
  };
  metodo_detalle: string;
};

// --- COMPONENTE FILTRO FECHA ---
type DateRange = { from: string; to: string };

function DateRangeFilter({
  onChange,
}: {
  onChange: (range: DateRange | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState("");
  const [tempTo, setTempTo] = useState("");
  const [activeLabel, setActiveLabel] = useState("Fecha");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCustomApply = () => {
    if (!tempFrom && !tempTo) return;
    setActiveLabel(`${tempFrom} - ${tempTo}`);
    onChange({ from: tempFrom, to: tempTo });
    setIsOpen(false);
  };

  const clearFilter = () => {
    setTempFrom("");
    setTempTo("");
    setActiveLabel("Fecha");
    onChange(null);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full sm:w-auto flex items-center justify-between gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
          activeLabel !== "Fecha"
            ? "bg-blue-50 border-blue-200 text-blue-700"
            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span className="truncate max-w-[150px]">{activeLabel}</span>
        </div>
        {activeLabel !== "Fecha" && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              clearFilter();
            }}
            role="button"
            className="p-0.5 hover:bg-blue-200 rounded-full"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-700"
                value={tempFrom}
                onChange={(e) => setTempFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-700"
                value={tempTo}
                onChange={(e) => setTempTo(e.target.value)}
              />
            </div>
            <button
              onClick={handleCustomApply}
              className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- BADGE ---
function StatusBadge({ status }: { status: MPStatus }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: Record<string, { label: string; style: string; icon: any }> = {
    approved: {
      label: "Aprobado",
      style: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
    },
    pending: {
      label: "Pendiente",
      style: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Clock,
    },
    in_process: {
      label: "Procesando",
      style: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Clock,
    },
    rejected: {
      label: "Rechazado",
      style: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    },
    refunded: {
      label: "Reembolsado",
      style: "bg-gray-100 text-gray-600 border-gray-200",
      icon: XCircle,
    },
    created: {
      label: "Creado",
      style: "bg-gray-100 text-gray-500 border-gray-200",
      icon: Clock,
    },
  };
  const { label, style, icon: Icon } = config[status] || config.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}
    >
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
  loading,
}: any) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
      <div className="w-full">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-gray-100 animate-pulse rounded mt-2"></div>
        ) : (
          <h3 className="text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
            {value}
          </h3>
        )}
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-2 sm:p-3 rounded-lg ${colorClass}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );
}

export default function PagosPage() {
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("approved");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  useEffect(() => {
    async function fetchPagos() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/pagos");

        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error(
            `El servidor no devolvió una respuesta válida (${res.status})`,
          );
        }

        if (!res.ok) {
          throw new Error(
            data.error || `Error desconocido del servidor (${res.status})`,
          );
        }

        setPagos(data.pagos || []);
      } catch (err: any) {
        console.error("Error fetching pagos:", err);
        setError(err.message || "No se pudieron cargar los pagos.");
      } finally {
        setLoading(false);
      }
    }
    fetchPagos();
  }, []);

  // --- FILTRADO A PRUEBA DE FALLOS ---
  const filteredPagos = useMemo(() => {
    return pagos.filter((p) => {
      const searchString = q.toLowerCase();

      // ✅ CORRECCIÓN: Usamos (campo || "") para asegurar que siempre haya un string antes de toLowerCase()
      const matchesText =
        (p.mp_payment_id || "").toLowerCase().includes(searchString) ||
        (p.cliente?.nombre || "").toLowerCase().includes(searchString) ||
        (p.cliente?.apellido || "").toLowerCase().includes(searchString) ||
        (p.cliente?.email || "").toLowerCase().includes(searchString);

      // Filtro Estado
      const matchesStatus = filterStatus === "all" || p.estado === filterStatus;

      // Filtro Fecha
      let matchesDate = true;
      if (dateRange) {
        const itemDate = new Date(p.fecha).setHours(0, 0, 0, 0);
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from).setHours(0, 0, 0, 0);
          if (itemDate < fromDate) matchesDate = false;
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to).setHours(23, 59, 59, 999);
          const itemTime = new Date(p.fecha).getTime();
          if (itemTime > toDate) matchesDate = false;
        }
      }

      return matchesText && matchesStatus && matchesDate;
    });
  }, [pagos, q, filterStatus, dateRange]);

  const stats = useMemo(() => {
    const listToCalculate = filteredPagos;
    const total = listToCalculate.reduce((acc, curr) => acc + curr.monto, 0);
    const count = listToCalculate.length;
    return { total, count };
  }, [filteredPagos]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 pb-20 sm:pb-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
            <p className="text-sm text-gray-500">
              Historial de ingresos confirmados
            </p>
          </div>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> <span>Exportar</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <StatCard
            title="Total Ingresos (Vista)"
            value={`$${stats.total.toLocaleString("es-AR")}`}
            subtext="Suma de pagos en lista"
            icon={DollarSign}
            colorClass="bg-emerald-100 text-emerald-600"
            loading={loading}
          />
          <StatCard
            title="Transacciones"
            value={stats.count}
            subtext="Cantidad de operaciones"
            icon={CheckCircle2}
            colorClass="bg-blue-100 text-blue-600"
            loading={loading}
          />
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-3">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <div className="relative w-1/2 lg:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none w-full pl-4 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="approved">Confirmados</option>
                <option value="all">Todos (Admin)</option>
                <option value="rejected">Rechazados</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
            <div className="w-1/2 lg:w-auto">
              <DateRangeFilter onChange={setDateRange} />
            </div>
          </div>
        </div>

        {/* CONTENEDOR DE DATOS */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
              <p>Cargando...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="bg-red-50 p-4 rounded-full mb-3">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Error al cargar datos
              </h3>
              <p className="text-sm text-gray-500 max-w-md">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : filteredPagos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="bg-gray-50 p-4 rounded-full mb-3">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p>No se encontraron pagos con estos filtros.</p>
            </div>
          ) : (
            <>
              {/* VISTA ESCRITORIO (Tabla) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">ID / MP</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Método</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Monto</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPagos.map((p) => (
                      <tr
                        key={p.id_pago}
                        className="hover:bg-gray-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-gray-500">
                              #{p.id_pago}
                            </span>
                            <div
                              className="flex items-center gap-1.5 mt-0.5"
                              title="ID Referencia"
                            >
                              <span className="font-medium text-gray-900 text-sm truncate w-24">
                                {p.mp_payment_id || "N/A"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-sm">
                              {p.cliente.nombre || "Invitado"}{" "}
                              {p.cliente.apellido}
                            </span>
                            <span className="text-xs text-gray-500 truncate w-32">
                              {p.cliente.email || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(p.fecha).toLocaleDateString("es-AR")}
                          <div className="text-xs text-gray-400">
                            {new Date(p.fecha).toLocaleTimeString("es-AR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {p.metodo_detalle}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={p.estado} />
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          ${p.monto.toLocaleString("es-AR")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/pagos/${p.id_pago}`}
                            className="inline-flex p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VISTA MÓVIL (Tarjetas) */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredPagos.map((p) => (
                  <Link
                    href={`/admin/pagos/${p.id_pago}`}
                    key={p.id_pago}
                    className="block p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors relative group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">
                          {p.cliente.nombre || "Invitado"} {p.cliente.apellido}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          #{p.id_pago} •{" "}
                          {new Date(p.fecha).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                      <StatusBadge status={p.estado} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <CreditCard className="w-3 h-3" />
                          {p.metodo_detalle}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(p.fecha).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          ${p.monto.toLocaleString("es-AR")}
                        </span>
                        <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
