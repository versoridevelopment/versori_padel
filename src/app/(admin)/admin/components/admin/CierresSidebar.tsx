"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Trash2, Calendar, CheckCircle2 } from "lucide-react";

type CanchaLite = { id_cancha: number; nombre: string };

type CierreRow = {
  id_cierre: number;
  id_club: number;
  id_cancha: number | null;
  fecha: string;            // YYYY-MM-DD
  inicio: string | null;    // HH:MM:SS | null
  fin: string | null;       // HH:MM:SS | null
  fin_dia_offset: 0 | 1;
  motivo: string | null;
  activo: boolean;
  created_at: string;
};

function hhmmFromTime(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

export default function CierresSidebar(props: {
  isOpen: boolean;
  onClose: () => void;
  idClub: number;
  canchas: CanchaLite[];
  defaultFecha?: string;
}) {
  const { isOpen, onClose, idClub, canchas } = props;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState(props.defaultFecha ?? new Date().toISOString().slice(0, 10));
  const [showInactivos, setShowInactivos] = useState(false);

  // Form
  const [scope, setScope] = useState<"club" | "cancha">("club");
  const [idCancha, setIdCancha] = useState<number | "">("");
  const [cierreTotal, setCierreTotal] = useState(true);
  const [inicio, setInicio] = useState("10:00");
  const [fin, setFin] = useState("18:00");
  const [cruza, setCruza] = useState(false);
  const [motivo, setMotivo] = useState("");

  const [cierres, setCierres] = useState<CierreRow[]>([]);

  const canchasById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of canchas) m.set(c.id_cancha, c.nombre);
    return m;
  }, [canchas]);

  async function load() {
    try {
      setError(null);
      setLoading(true);

      const qs = new URLSearchParams();
      qs.set("id_club", String(idClub));
      qs.set("fecha", fecha);
      if (showInactivos) qs.set("include_inactivos", "1");

      const res = await fetch(`/api/admin/cierres?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Error");

      setCierres(json.cierres ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fecha, showInactivos, idClub]);

  async function createCierre() {
    try {
      setError(null);
      setSaving(true);

      const payload: any = {
        id_club: idClub,
        fecha,
        cierre_total: cierreTotal,
        motivo: motivo.trim() ? motivo.trim() : null,
        activo: true,
      };

      if (scope === "cancha") {
        if (!idCancha) throw new Error("Elegí una cancha");
        payload.id_cancha = Number(idCancha);
      } else {
        payload.id_cancha = null;
      }

      if (!cierreTotal) {
        payload.inicio = inicio;
        payload.fin = fin;
        payload.cruza_medianoche = cruza;
      }

      const res = await fetch(`/api/admin/cierres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Error al crear");

      await load();
      setMotivo("");
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(row: CierreRow, next: boolean) {
    try {
      setError(null);

      const res = await fetch(`/api/admin/cierres/${row.id_cierre}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_club: idClub, activo: next }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Error");

      setCierres((prev) => prev.map((x) => (x.id_cierre === row.id_cierre ? { ...x, activo: next } : x)));
    } catch (e: any) {
      setError(e?.message ?? "Error");
    }
  }

  async function remove(row: CierreRow) {
    try {
      setError(null);
      const res = await fetch(`/api/admin/cierres/${row.id_cierre}?id_club=${idClub}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Error");

      setCierres((prev) => prev.filter((x) => x.id_cierre !== row.id_cierre));
    } catch (e: any) {
      setError(e?.message ?? "Error");
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

      {/* drawer */}
      <div className="fixed right-0 top-0 h-[100dvh] w-full sm:w-[460px] bg-[#0b1623] text-white z-[60] border-l border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#0d1b2a]">
          <div className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-300" />
            Cierres
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-auto h-[calc(100%-64px)]">
          {/* Filtros */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-300">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-gray-700 bg-[#0d1b2a] rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="pt-5 flex items-center gap-2">
              <input type="checkbox" checked={showInactivos} onChange={(e) => setShowInactivos(e.target.checked)} />
              <span className="text-xs text-gray-300">Ver inactivos</span>
            </div>
          </div>

          {/* Form crear */}
          <div className="border border-gray-800 rounded-xl p-3 space-y-3 bg-[#0d1b2a]">
            <div className="font-semibold">Crear cierre</div>

            <div className="flex gap-2">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="border border-gray-700 bg-[#0b1623] rounded px-3 py-2 w-44 text-sm"
              >
                <option value="club">Todo el club</option>
                <option value="cancha">Por cancha</option>
              </select>

              <select
                value={idCancha}
                onChange={(e) => setIdCancha(e.target.value ? Number(e.target.value) : "")}
                disabled={scope !== "cancha"}
                className="border border-gray-700 bg-[#0b1623] rounded px-3 py-2 flex-1 text-sm disabled:opacity-50"
              >
                <option value="">Seleccionar cancha…</option>
                {canchas.map((c) => (
                  <option key={c.id_cancha} value={c.id_cancha}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input type="checkbox" checked={cierreTotal} onChange={(e) => setCierreTotal(e.target.checked)} />
              Cierre total (todo el día)
            </label>

            {!cierreTotal && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-300">Inicio</label>
                    <input
                      type="time"
                      value={inicio}
                      onChange={(e) => setInicio(e.target.value)}
                      className="w-full border border-gray-700 bg-[#0b1623] rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-300">Fin</label>
                    <input
                      type="time"
                      value={fin}
                      onChange={(e) => setFin(e.target.value)}
                      className="w-full border border-gray-700 bg-[#0b1623] rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input type="checkbox" checked={cruza} onChange={(e) => setCruza(e.target.checked)} />
                  Cruza medianoche
                </label>
              </>
            )}

            <div>
              <label className="text-xs text-gray-300">Motivo (opcional)</label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="mantenimiento / lluvia / evento…"
                className="w-full border border-gray-700 bg-[#0b1623] rounded px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={createCierre}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Crear
            </button>

            {error && <div className="text-sm text-red-300">{error}</div>}
          </div>

          {/* Listado */}
          <div className="border border-gray-800 rounded-xl p-3 bg-[#0d1b2a]">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Cierres ({cierres.length})</div>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>

            {cierres.length === 0 ? (
              <div className="text-sm text-gray-400">No hay cierres para esta fecha.</div>
            ) : (
              <div className="space-y-2">
                {cierres.map((c) => {
                  const scopeLabel = c.id_cancha ? `Cancha: ${canchasById.get(c.id_cancha) ?? c.id_cancha}` : "Todo el club";
                  const rango =
                    c.inicio && c.fin
                      ? `${hhmmFromTime(c.inicio)}–${hhmmFromTime(c.fin)}${c.fin_dia_offset ? " (+1)" : ""}`
                      : "Todo el día";

                  return (
                    <div key={c.id_cierre} className="border border-gray-800 rounded-lg p-2 flex items-start justify-between gap-3 bg-[#0b1623]">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{scopeLabel}</div>
                        <div className="text-xs text-gray-300">{c.fecha} · {rango}</div>
                        {c.motivo && <div className="text-xs text-gray-400 truncate">Motivo: {c.motivo}</div>}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs flex items-center gap-2 text-gray-200">
                          <input type="checkbox" checked={c.activo} onChange={(e) => toggleActivo(c, e.target.checked)} />
                          Activo
                        </label>

                        <button onClick={() => remove(c)} className="p-2 rounded hover:bg-white/10" title="Borrar">
                          <Trash2 className="w-4 h-4 text-red-300" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-400">
            Cierre total = bloquea todo el día. Parcial puede cruzar medianoche.
          </div>
        </div>
      </div>
    </>
  );
}
