"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Clock,
  RefreshCw,
  Filter,
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Calendar,
} from "lucide-react";
import Link from "next/link";

type Estado =
  | "pendiente_pago"
  | "confirmada"
  | "expirada"
  | "rechazada"
  | "cancelada";

type ReservaRow = {
  id_reserva: number;
  fecha: string;
  inicio: string;
  fin: string;
  fin_dia_offset: 0 | 1;
  estado: Estado;
  precio_total: number | null;
  monto_anticipo: number | null;
  confirmed_at: string | null;
  created_at: string | null;
  cancha_nombre: string | null;
};

type ApiResp = {
  ok: boolean;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  reservas: ReservaRow[];
  error?: string;
};

function fmtMoney(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(v);
}

function StatusBadge({ estado }: { estado: Estado }) {
  const styles: Record<string, string> = {
    confirmada: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pendiente_pago: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rechazada: "bg-red-500/10 text-red-400 border-red-500/20",
    cancelada: "bg-red-500/10 text-red-400 border-red-500/20",
    expirada: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  const icons: Record<string, any> = {
    confirmada: CheckCircle2,
    pendiente_pago: Clock,
    rechazada: XCircle,
    cancelada: XCircle,
    expirada: AlertTriangle,
  };

  const Icon = icons[estado] || AlertTriangle;
  const style = styles[estado] || styles.expirada;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${style}`}
    >
      <Icon className="w-3 h-3" />
      {estado.replace("_", " ")}
    </span>
  );
}

export default function MisReservasPage() {
  const [rows, setRows] = useState<ReservaRow[]>([]);
  const [firstLoading, setFirstLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [estado, setEstado] = useState<string>("");
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  const filtersQuery = useMemo(() => {
    const sp = new URLSearchParams();
    if (estado) sp.set("estado", estado);
    if (desde) sp.set("desde", desde);
    if (hasta) sp.set("hasta", hasta);
    return sp.toString();
  }, [estado, desde, hasta]);

  async function fetchPage(p: number, mode: "reset" | "append") {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (mode === "reset") {
      setFirstLoading(true);
      setRows([]);
      setErr(null);
      setPage(1);
      setTotalPages(0);
    } else {
      setLoadingMore(true);
      setErr(null);
    }

    try {
      const sp = new URLSearchParams(filtersQuery ? filtersQuery : "");
      sp.set("page", String(p));
      sp.set("page_size", String(pageSize));

      const res = await fetch(`/api/mis-reservas?${sp.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as ApiResp | null;

      if (!res.ok || !json?.ok) {
        const msg =
          (json as any)?.error || "No se pudieron cargar tus reservas.";
        setErr(msg);
        if (mode === "reset") setRows([]);
        return;
      }

      setTotalPages(Number(json.total_pages || 0));

      if (mode === "reset") {
        setRows(json.reservas || []);
        setPage(1);
      } else {
        setRows((prev) => {
          const incoming = json.reservas || [];
          const seen = new Set(prev.map((x) => x.id_reserva));
          const merged = [
            ...prev,
            ...incoming.filter((x) => !seen.has(x.id_reserva)),
          ];
          return merged;
        });
      }
    } catch (e: any) {
      setErr(e?.message || "Error de red.");
      if (mode === "reset") setRows([]);
    } finally {
      inFlightRef.current = false;
      setFirstLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchPage(1, "reset");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersQuery]);

  const canLoadMore = useMemo(() => {
    if (firstLoading) return false;
    if (loadingMore) return false;
    if (totalPages === 0) return false;
    return page < totalPages;
  }, [firstLoading, loadingMore, page, totalPages]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!canLoadMore) return;

        const next = page + 1;
        setPage(next);
        fetchPage(next, "append");
      },
      { root: null, rootMargin: "400px 0px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadMore, page]);

  return (
    <section className="min-h-screen bg-[#09090b] text-white px-4 py-8 md:px-8 md:py-12 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Mis Reservas
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Historial de turnos en este club.
            </p>
          </div>

          <button
            onClick={() => fetchPage(1, "reset")}
            className="self-start md:self-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4 text-zinc-400 text-sm uppercase tracking-wider font-bold">
            <Filter className="w-4 h-4" />
            Filtros
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-white/10 focus:border-zinc-600 outline-none appearance-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="confirmada">Confirmadas</option>
              <option value="pendiente_pago">Pendientes de Pago</option>
              <option value="rechazada">Rechazadas</option>
              <option value="expirada">Expiradas</option>
            </select>

            <div className="relative">
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-white/10 focus:border-zinc-600 outline-none [color-scheme:dark]"
                placeholder="Desde"
              />
            </div>

            <div className="relative">
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:ring-2 focus:ring-white/10 focus:border-zinc-600 outline-none [color-scheme:dark]"
                placeholder="Hasta"
              />
            </div>
          </div>
        </div>

        {/* CONTENIDO */}
        {firstLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Cargando reservas...</p>
          </div>
        )}

        {!firstLoading && err && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-semibold mb-1">Ocurrió un error</p>
            <p className="text-red-300/80 text-sm">{err}</p>
          </div>
        )}

        {!firstLoading && !err && rows.length === 0 && (
          <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
            <div className="bg-zinc-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <CalendarDays className="w-6 h-6" />
            </div>
            <p className="text-zinc-300 font-medium">
              No se encontraron reservas
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              Prueba cambiando los filtros de búsqueda.
            </p>
          </div>
        )}

        {!firstLoading && !err && rows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((r) => (
              <Link
                key={r.id_reserva}
                href={`/mis-reservas/${r.id_reserva}`}
                className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 transition-all hover:bg-zinc-800/50"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-zinc-500 font-mono">
                        #{r.id_reserva}
                      </span>
                      <StatusBadge estado={r.estado} />
                    </div>
                    <h3 className="font-bold text-white text-lg">
                      {fmtMoney(r.precio_total)}
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                </div>

                <div className="space-y-2 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-300 text-sm">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span>
                      {new Date(r.fecha + "T12:00:00").toLocaleDateString(
                        "es-AR",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300 text-sm">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span>
                      {r.inicio?.slice(0, 5)} - {r.fin?.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300 text-sm">
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    <span className="truncate">{r.cancha_nombre}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Sentinel + Loader Paginación */}
        <div
          ref={sentinelRef}
          className="h-10 mt-6 flex items-center justify-center"
        >
          {loadingMore && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando más...
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
