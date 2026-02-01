"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ApiError = { error: string };

// ✅ Duraciones permitidas: 30 min a 4 hs (240), pasos de 30
const DURACIONES = [30, 60, 90, 120, 150, 180, 210, 240] as const;
type DuracionMin = (typeof DURACIONES)[number];

type Regla = {
  id_regla: number;
  id_tarifario: number;
  segmento: "publico" | "profe";
  dow: number | null;
  hora_desde: string; // "10:00:00"
  hora_hasta: string; // "14:00:00"
  cruza_medianoche: boolean;
  duracion_min: number; // ✅ antes: 60 | 90 | 120
  precio: number;
  prioridad: number;
  activo: boolean;
  vigente_desde: string; // "YYYY-MM-DD"
  vigente_hasta: string | null;
};

const DOW_LABEL: Record<string, string> = {
  all: "Todos",
  "0": "Dom",
  "1": "Lun",
  "2": "Mar",
  "3": "Mié",
  "4": "Jue",
  "5": "Vie",
  "6": "Sáb",
};

function fmtTime(h: string) {
  return (h || "").slice(0, 5);
}

function fmtMoney(n: number) {
  return `$${Number(n || 0).toLocaleString("es-AR")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TarifasDeTarifarioClient({
  clubId,
  clubNombre,
  idTarifario,
}: {
  clubId: number;
  clubNombre: string;
  idTarifario: number;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tarifarioNombre, setTarifarioNombre] = useState<string>("");
  const [reglas, setReglas] = useState<Regla[]>([]);

  // modo edición
  const [editingId, setEditingId] = useState<number | null>(null);
  const isEditing = editingId !== null;

  // form (crear/editar)
  const [segmento, setSegmento] = useState<"publico" | "profe">("publico");
  const [dow, setDow] = useState<string>("all");
  const [horaDesde, setHoraDesde] = useState("10:00");
  const [horaHasta, setHoraHasta] = useState("14:00");
  const [cruzaMedianoche, setCruzaMedianoche] = useState(false);

  const [duracion, setDuracion] = useState<DuracionMin>(60);

  const [precio, setPrecio] = useState<number>(12000);
  const [prioridad, setPrioridad] = useState<number>(10);

  // opcionales (crear/editar)
  const [activoForm, setActivoForm] = useState<boolean>(true);
  const [vigenteDesde, setVigenteDesde] = useState<string>("");
  const [vigenteHasta, setVigenteHasta] = useState<string>("");

  function resetFormToCreateDefaults() {
    setEditingId(null);

    setSegmento("publico");
    setDow("all");
    setHoraDesde("10:00");
    setHoraHasta("14:00");
    setCruzaMedianoche(false);
    setDuracion(60);
    setPrecio(12000);
    setPrioridad(10);

    setActivoForm(true);
    setVigenteDesde("");
    setVigenteHasta("");
  }

  function loadRuleIntoForm(r: Regla) {
    setEditingId(r.id_regla);

    setSegmento(r.segmento);
    setDow(r.dow === null ? "all" : String(r.dow));
    setHoraDesde(fmtTime(r.hora_desde));
    setHoraHasta(fmtTime(r.hora_hasta));
    setCruzaMedianoche(!!r.cruza_medianoche);

    // ✅ si viene un valor que no está en el select, caemos en 60
    const d = Number(r.duracion_min);
    setDuracion((DURACIONES as readonly number[]).includes(d) ? (d as DuracionMin) : 60);

    setPrecio(Number(r.precio) || 0);
    setPrioridad(Number(r.prioridad) || 0);

    setActivoForm(!!r.activo);
    setVigenteDesde(r.vigente_desde || "");
    setVigenteHasta(r.vigente_hasta || "");

    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  }

  function duplicateRuleToCreate(r: Regla) {
    setEditingId(null);

    setSegmento(r.segmento);
    setDow(r.dow === null ? "all" : String(r.dow));
    setHoraDesde(fmtTime(r.hora_desde));
    setHoraHasta(fmtTime(r.hora_hasta));
    setCruzaMedianoche(!!r.cruza_medianoche);

    const d = Number(r.duracion_min);
    setDuracion((DURACIONES as readonly number[]).includes(d) ? (d as DuracionMin) : 60);

    setPrecio(Number(r.precio) || 0);
    setPrioridad(Number(r.prioridad) || 0);

    setActivoForm(true);

    setVigenteDesde(r.vigente_desde || "");
    setVigenteHasta(r.vigente_hasta || "");

    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  }

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/tarifarios/${idTarifario}/tarifas`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(e?.error || "Error al cargar tarifas");
      }

      const data = await res.json();

      const nombreFromApi =
        data?.tarifario?.nombre ??
        data?.nombre ??
        data?.tarifario_nombre ??
        `Tarifario #${idTarifario}`;

      setTarifarioNombre(nombreFromApi);
      setReglas((data?.reglas ?? []) as Regla[]);
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idTarifario]);

  const canSubmit = useMemo(() => {
    if (!horaDesde.trim() || !horaHasta.trim()) return false;
    if (Number.isNaN(Number(precio)) || Number(precio) < 0) return false;
    if (vigenteDesde && vigenteHasta && vigenteHasta < vigenteDesde) return false;
    return true;
  }, [horaDesde, horaHasta, precio, vigenteDesde, vigenteHasta]);

  async function onCreateOrUpdate() {
    if (!canSubmit || saving) return;

    setSaving(true);
    try {
      const common = {
        segmento,
        dow: dow === "all" ? null : Number(dow),
        hora_desde: `${horaDesde}:00`,
        hora_hasta: `${horaHasta}:00`,
        cruza_medianoche: cruzaMedianoche,
        duracion_min: duracion,
        precio,
        prioridad,
        activo: activoForm,
        vigente_desde: vigenteDesde ? vigenteDesde : undefined,
        vigente_hasta: vigenteHasta ? vigenteHasta : null,
      };

      if (!isEditing) {
        const res = await fetch(`/api/admin/tarifarios/${idTarifario}/tarifas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(common),
        });

        if (!res.ok) {
          const e = (await res.json().catch(() => null)) as ApiError | null;
          throw new Error(e?.error || "No se pudo crear la regla");
        }

        await load();
        return;
      }

      const res = await fetch(`/api/admin/tarifas/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(common),
      });

      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(e?.error || "No se pudo guardar la edición");
      }

      await load();
      resetFormToCreateDefaults();
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(id_regla: number, activo: boolean) {
    try {
      const res = await fetch(`/api/admin/tarifas/${id_regla}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });

      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(e?.error || "No se pudo actualizar");
      }

      setReglas((prev) =>
        prev.map((r) => (r.id_regla === id_regla ? { ...r, activo } : r))
      );

      if (editingId === id_regla) setActivoForm(activo);
    } catch (err: any) {
      alert(err?.message || "Error al actualizar");
    }
  }

  async function desactivar(id_regla: number) {
    if (!confirm("¿Desactivar esta regla?")) return;

    try {
      const res = await fetch(`/api/admin/tarifas/${id_regla}`, { method: "DELETE" });

      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(e?.error || "No se pudo desactivar");
      }

      setReglas((prev) =>
        prev.map((r) => (r.id_regla === id_regla ? { ...r, activo: false } : r))
      );

      if (editingId === id_regla) setActivoForm(false);
    } catch (err: any) {
      alert(err?.message || "Error al desactivar");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tarifas</h1>
          <p className="text-sm text-gray-600 mt-1">
            {clubNombre} · {tarifarioNombre} · Reglas por franja horaria (público / profe).
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/personalizacion/tarifarios"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Volver
          </Link>

          <button
            onClick={load}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Recargar
          </button>
        </div>
      </div>

      {/* Estado */}
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Cargando tarifas…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {error}
          <div className="mt-3">
            <button
              onClick={load}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Form (crear/editar) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-gray-900">
                {isEditing ? `Editar regla #${editingId}` : "Crear regla"}
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={resetFormToCreateDefaults}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <select
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value as any)}
              >
                <option value="publico">Público</option>
                <option value="profe">Profe</option>
              </select>

              <select
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                value={dow}
                onChange={(e) => setDow(e.target.value)}
              >
                <option value="all">Todos los días</option>
                <option value="0">Domingo</option>
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
              </select>

              <input
                type="time"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                value={horaDesde}
                onChange={(e) => setHoraDesde(e.target.value)}
              />

              <input
                type="time"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                value={horaHasta}
                onChange={(e) => setHoraHasta(e.target.value)}
              />

              {/* ✅ Duración 30–240 */}
              <select
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                value={String(duracion)}
                onChange={(e) => setDuracion(Number(e.target.value) as DuracionMin)}
              >
                {DURACIONES.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>

              <input
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={String(precio)}
                onChange={(e) => setPrecio(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                placeholder="Precio"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2 select-none">
                <input
                  type="checkbox"
                  checked={cruzaMedianoche}
                  onChange={(e) => setCruzaMedianoche(e.target.checked)}
                />
                Cruza medianoche
              </label>

              <input
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2"
                value={String(prioridad)}
                onChange={(e) => setPrioridad(Number(e.target.value.replace(/[^\d-]/g, "")) || 0)}
                placeholder="Prioridad (ej: 10 / 200)"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2 select-none">
                <input
                  type="checkbox"
                  checked={activoForm}
                  onChange={(e) => setActivoForm(e.target.checked)}
                />
                Activo
              </label>
            </div>

            {/* Fechas (opcionales) */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Vigente desde (opcional)
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                  value={vigenteDesde}
                  onChange={(e) => setVigenteDesde(e.target.value)}
                  placeholder={todayISO()}
                />
                <div className="mt-1 text-[11px] text-gray-500">
                  Si queda vacío, el server usará “hoy”.
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Vigente hasta (opcional)
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                  value={vigenteHasta}
                  onChange={(e) => setVigenteHasta(e.target.value)}
                />
                <div className="mt-1 text-[11px] text-gray-500">
                  Si queda vacío, queda sin vencimiento (null).
                </div>
              </div>

              <div className="md:col-span-2 flex gap-2 justify-end">
                <button
                  onClick={onCreateOrUpdate}
                  disabled={!canSubmit || saving}
                  className="rounded-xl bg-[#003366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00284f] disabled:opacity-60"
                  title={!canSubmit ? "Revisá horarios, precio y rango de fechas" : ""}
                >
                  {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear"}
                </button>
              </div>

              {vigenteDesde && vigenteHasta && vigenteHasta < vigenteDesde && (
                <div className="md:col-span-6 text-xs text-rose-700">
                  Vigente hasta no puede ser menor que vigente desde.
                </div>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {reglas.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No hay reglas para mostrar.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-600">
                      <th className="px-5 py-3 font-semibold">Segmento</th>
                      <th className="px-5 py-3 font-semibold">Día</th>
                      <th className="px-5 py-3 font-semibold">Horario</th>
                      <th className="px-5 py-3 font-semibold">Duración</th>
                      <th className="px-5 py-3 font-semibold">Precio</th>
                      <th className="px-5 py-3 font-semibold">Prioridad</th>
                      <th className="px-5 py-3 font-semibold">Vigencia</th>
                      <th className="px-5 py-3 font-semibold">Activo</th>
                      <th className="px-5 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {reglas.map((r) => {
                      const dayLabel =
                        r.dow === null ? "Todos" : DOW_LABEL[String(r.dow)] ?? String(r.dow);

                      const horario = `${fmtTime(r.hora_desde)}–${fmtTime(r.hora_hasta)}${
                        r.cruza_medianoche ? " (+1)" : ""
                      }`;

                      const rowEditing = editingId === r.id_regla;

                      const vigencia = `${r.vigente_desde || "—"}${
                        r.vigente_hasta ? ` → ${r.vigente_hasta}` : " → ∞"
                      }`;

                      return (
                        <tr
                          key={r.id_regla}
                          className={[
                            "hover:bg-gray-50/50",
                            rowEditing ? "bg-[#003366]/5" : "",
                          ].join(" ")}
                        >
                          <td className="px-5 py-4">{r.segmento}</td>
                          <td className="px-5 py-4">{dayLabel}</td>
                          <td className="px-5 py-4">{horario}</td>
                          <td className="px-5 py-4">{r.duracion_min} min</td>
                          <td className="px-5 py-4">{fmtMoney(r.precio)}</td>
                          <td className="px-5 py-4">{r.prioridad}</td>
                          <td className="px-5 py-4">{vigencia}</td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() => toggleActivo(r.id_regla, !r.activo)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                r.activo ? "bg-[#0d1b2a]" : "bg-gray-300"
                              }`}
                              title={r.activo ? "Activa (clic para desactivar)" : "Inactiva (clic para activar)"}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                  r.activo ? "translate-x-5" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => loadRuleIntoForm(r)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                                title="Cargar en el formulario para editar"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => duplicateRuleToCreate(r)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                                title="Duplicar: copia al formulario para crear otra"
                              >
                                Duplicar
                              </button>

                              <button
                                onClick={() => desactivar(r.id_regla)}
                                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                              >
                                Desactivar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
