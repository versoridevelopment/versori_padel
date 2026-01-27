"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, RefreshCw, Filter } from "lucide-react";

type Estado = "pendiente_pago" | "confirmada" | "expirada" | "rechazada";

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

function fmtMoney(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "-";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v);
}

function badge(estado: Estado) {
  const base = "text-xs px-2 py-1 rounded-full border";
  switch (estado) {
    case "confirmada":
      return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`;
    case "pendiente_pago":
      return `${base} border-yellow-500/30 bg-yellow-500/10 text-yellow-200`;
    case "rechazada":
      return `${base} border-rose-500/30 bg-rose-500/10 text-rose-200`;
    case "expirada":
      return `${base} border-gray-400/30 bg-gray-400/10 text-gray-200`;
    default:
      return `${base} border-white/20 bg-white/5 text-white`;
  }
}

export default function MisReservasPage() {
  const [rows, setRows] = useState<ReservaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [estado, setEstado] = useState<string>(""); // filtro
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (estado) sp.set("estado", estado);
    if (desde) sp.set("desde", desde);
    if (hasta) sp.set("hasta", hasta);
    return sp.toString();
  }, [estado, desde, hasta]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/mis-reservas${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || "No se pudieron cargar tus reservas.");
        setRows([]);
        setLoading(false);
        return;
      }

      setRows((json?.reservas || []) as ReservaRow[]);
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message || "Error de red.");
      setRows([]);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Mis reservas</h1>
            <p className="text-neutral-300 mt-1">
              Todas tus reservas en este club (según el subdominio donde estás).
            </p>
          </div>

          <button
            onClick={load}
            className="bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 rounded-xl font-semibold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-[#0b2545] border border-[#1b4e89] rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 text-neutral-200">
            <Filter className="w-4 h-4" />
            <span className="font-semibold">Filtros</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="bg-[#071b33] border border-white/10 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="confirmada">Confirmadas</option>
              <option value="pendiente_pago">Pendientes</option>
              <option value="rechazada">Rechazadas</option>
              <option value="expirada">Expiradas</option>
            </select>

            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-[#071b33] border border-white/10 rounded-xl px-3 py-2 text-sm"
              placeholder="Desde"
            />

            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-[#071b33] border border-white/10 rounded-xl px-3 py-2 text-sm"
              placeholder="Hasta"
            />
          </div>
        </div>

        {/* Estado */}
        {loading && (
          <div className="bg-[#0b2545] border border-[#1b4e89] rounded-2xl p-6 text-center text-neutral-200">
            Cargando reservas…
          </div>
        )}

        {!loading && err && (
          <div className="bg-[#0b2545] border border-rose-500/40 rounded-2xl p-6 text-center">
            <p className="text-rose-200 font-semibold mb-2">No se pudo cargar</p>
            <p className="text-neutral-200">{err}</p>
          </div>
        )}

        {!loading && !err && rows.length === 0 && (
          <div className="bg-[#0b2545] border border-[#1b4e89] rounded-2xl p-6 text-center text-neutral-200">
            No tenés reservas para estos filtros.
          </div>
        )}

        {!loading && !err && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={r.id_reserva}
                className="bg-[#0b2545] border border-[#1b4e89] rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">Reserva #{r.id_reserva}</span>
                      <span className={badge(r.estado)}>{r.estado}</span>
                    </div>

                    <div className="text-sm text-neutral-200 mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 opacity-80" />
                        <span>{r.fecha}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 opacity-80" />
                        <span>
                          {r.inicio} - {r.fin}
                          {r.fin_dia_offset === 1 ? " (+1)" : ""}
                        </span>
                      </div>

                      <div className="opacity-90">
                        Cancha: <span className="font-semibold">{r.cancha_nombre ?? "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-neutral-300">Total</div>
                    <div className="text-xl font-bold">{fmtMoney(r.precio_total)}</div>
                    <div className="text-xs text-neutral-300 mt-1">
                      Anticipo: {fmtMoney(r.monto_anticipo)}
                    </div>

                    <a
                      href={`/mis-reservas/${r.id_reserva}`}
                      className="inline-flex items-center gap-2 mt-3 bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-xl text-sm font-semibold"
                    >
                      Ver comprobante
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
