"use client";

import { useState } from "react";
import {
  User,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  CalendarDays,
  Check,
  RefreshCw,
  Clock,
} from "lucide-react";
import { formatMoney } from "../hooks/useReservaSidebar";
import type { CanchaUI } from "../types";
import ClientSearchInput from "./ClientSearchInput";

// ✅ Duraciones automáticas visibles cuando NO está manual
const DURACIONES_AUTO = [30, 60, 90, 120, 150, 180, 210, 240];

const normalizePhone = (input: string) => {
  if (!input) return "";
  let clean = input.replace(/\D/g, "");
  if (clean.startsWith("549")) clean = clean.slice(3);
  else if (clean.startsWith("54")) clean = clean.slice(2);
  if (clean.startsWith("0")) clean = clean.slice(1);
  return clean;
};

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  canchas: CanchaUI[];

  // AUTO
  availableTimes: { value: string; label: string; finLabel: string }[];

  // MANUAL
  manualDesdeOptions: { value: string; label: string }[];
  manualHastaOptions: { value: string; label: string }[];
  duracionManualCalculada: number;

  // display
  horaFinCalculada: string;

  priceLoading: boolean;
  priceError: string | null;
  createError: string | null;
  idClub: number;
}

export default function CreateReservaForm({
  formData,
  setFormData,
  canchas,
  availableTimes,
  manualDesdeOptions,
  manualHastaOptions,
  duracionManualCalculada,
  horaFinCalculada,
  priceLoading,
  priceError,
  createError,
  idClub,
}: Props) {
  const [checking, setChecking] = useState(false);
  const [matchFound, setMatchFound] = useState<string | null>(null);

  const esFijo = !!formData.esTurnoFijo;

  const toggleFijo = (checked: boolean) => {
    setFormData((p: any) => ({
      ...p,
      esTurnoFijo: checked,
      weeksAhead:
        Number.isFinite(Number(p.weeksAhead)) && Number(p.weeksAhead) > 0
          ? Number(p.weeksAhead)
          : 8,
      endDate: p.endDate || "",
    }));
  };

  const handleClientSelect = (cliente: {
    nombre: string;
    telefono: string;
    email: string;
  }) => {
    setFormData((prev: any) => ({
      ...prev,
      nombre: cliente.nombre,
      telefono: normalizePhone(cliente.telefono || prev.telefono),
      email: cliente.email || prev.email,
    }));
    setMatchFound(null);
  };

  const checkExistingUser = async (
    field: "nombre" | "telefono",
    value: string,
  ) => {
    if (!value || value.length < 3) return;

    const queryValue =
      field === "telefono" ? normalizePhone(value) : value.toLowerCase();

    if (field === "telefono" && queryValue.length < 4) return;

    setChecking(true);
    try {
      const res = await fetch(
        `/api/admin/clientes/search?q=${encodeURIComponent(
          queryValue,
        )}&id_club=${idClub}&type=manual`,
      );
      const json = await res.json();

      const results = json.results || [];
      if (results.length > 0) {
        const match =
          results.find((r: any) => {
            if (field === "telefono") {
              return normalizePhone(r.telefono) === queryValue;
            }
            return r.nombre.toLowerCase().includes(queryValue);
          }) || results[0];

        if (match) {
          if (field === "telefono" && match.nombre) {
            setFormData((prev: any) => ({
              ...prev,
              nombre: match.nombre,
              email: match.email || prev.email,
              telefono: normalizePhone(match.telefono),
            }));
            setMatchFound(`Cliente encontrado: ${match.nombre}`);
          }

          if (field === "nombre" && match.telefono && !formData.telefono) {
            setFormData((prev: any) => ({
              ...prev,
              telefono: normalizePhone(match.telefono),
              email: match.email || prev.email,
            }));
            setMatchFound(`Datos cargados de: ${match.nombre}`);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
      setTimeout(() => setMatchFound(null), 3000);
    }
  };

  return (
    <form className="space-y-6 pb-20" onSubmit={(e) => e.preventDefault()}>
      {/* SECCIÓN JUGADOR */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4 relative">
        {checking && (
          <div className="absolute top-4 right-4 text-xs text-orange-500 flex items-center gap-1 font-medium animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
          </div>
        )}

        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" /> Datos del Jugador
        </h3>

        <div className="space-y-3">
          <ClientSearchInput
            idClub={idClub}
            initialValue={formData.nombre}
            onSelect={handleClientSelect}
          />

          {/* Teléfono */}
          <div className="relative group">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              Teléfono <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9+\-\s]/g, "");
                  setFormData({ ...formData, telefono: val });
                }}
                onBlur={(e) => {
                  const finalClean = normalizePhone(e.target.value);
                  setFormData((prev: any) => ({
                    ...prev,
                    telefono: finalClean,
                  }));
                  checkExistingUser("telefono", finalClean);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm font-mono"
                placeholder="Ej: 3794123456"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Phone className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 ml-1">
              Se guardará solo el número (sin +54, 9, ni guiones).
            </p>
          </div>

          {/* Email */}
          <div className="relative group">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              Email (Opcional)
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                placeholder="cliente@email.com"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Mail className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {matchFound && (
          <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-200 rounded-lg text-xs font-bold text-green-800 animate-in fade-in slide-in-from-top-1 shadow-sm">
            <div className="bg-white p-1 rounded-full">
              <Check className="w-3 h-3 text-green-600" />
            </div>
            {matchFound}
          </div>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* SECCIÓN DATOS DEL TURNO */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800">
          Características del Turno
        </h3>

        {/* Cancha */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Cancha
          </label>
          <select
            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={formData.canchaId}
            onChange={(e) =>
              setFormData({ ...formData, canchaId: e.target.value })
            }
          >
            <option value="">Seleccionar cancha</option>
            {canchas.map((c) => (
              <option key={c.id_cancha} value={String(c.id_cancha)}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Turno fijo */}
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={esFijo}
              onChange={(e) => toggleFijo(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer"
            />
            Turno fijo (semanal)
          </label>

          {esFijo && (
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    Semanas a generar
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={Number(formData.weeksAhead || 8)}
                    onChange={(e) =>
                      setFormData((p: any) => ({
                        ...p,
                        weeksAhead: Math.max(
                          1,
                          Math.min(52, Number(e.target.value || 8)),
                        ),
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    Hasta (opcional)
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.endDate || ""}
                      onChange={(e) =>
                        setFormData((p: any) => ({
                          ...p,
                          endDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white pr-9 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                    />
                    <CalendarDays className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-green-800 bg-green-100/50 p-2 rounded-lg border border-green-100">
                <span className="font-bold">Nota:</span> El precio se calculará
                individualmente.
              </div>
            </div>
          )}
        </div>

        {/* Tipo de Turno */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2 ml-1">
            Tipo de turno
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              "Normal",
              "Profesor",
              "Torneo",
              "Escuela",
              "Cumpleaños",
              "Abonado",
            ].map((tipo) => {
              const v = tipo.toLowerCase().replace("ñ", "n");
              const isSelected = formData.tipoTurno === v;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFormData({ ...formData, tipoTurno: v })}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all active:scale-95
                    ${
                      isSelected
                        ? "bg-slate-800 border-slate-800 text-white shadow-md"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  {tipo}
                </button>
              );
            })}
          </div>
        </div>

        {/* ✅ Toggle Manual */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!formData.precioManual}
              onChange={(e) =>
                setFormData((p: any) => {
                  const checked = e.target.checked;

                  // Al activar manual, inicializamos desde/hasta con lo que ya había en auto
                  const baseDesde = p.horaInicio || p.horaInicioManual || "";
                  const baseDur = Number(p.duracion || 90);
                  const baseHasta =
                    baseDesde && baseDur
                      ? // si ya tenías un inicio, sugerimos fin = inicio + dur
                        // (el hook luego valida opciones reales)
                        (() => {
                          const [h, m] = String(baseDesde)
                            .slice(0, 5)
                            .split(":")
                            .map(Number);
                          const total = (h || 0) * 60 + (m || 0) + baseDur;
                          const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0");
                          const mm = String((total % 1440) % 60).padStart(2, "0");
                          return `${hh}:${mm}`;
                        })()
                      : "";

                  return {
                    ...p,
                    precioManual: checked,
                    precio: Number(p.precio || 0),
                    horaInicioManual: checked ? baseDesde : p.horaInicioManual,
                    horaFinManual: checked ? baseHasta : p.horaFinManual,
                  };
                })
              }
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer"
            />
            Precio manual (admin)
          </label>

          <p className="text-[11px] text-slate-500">
            Si está activo, elegís <b>Desde/Hasta</b> y el sistema calcula la{" "}
            <b>duración</b> (múltiplos de 30). No usa tarifarios.
          </p>
        </div>

        {/* ===========================
            AUTO: Hora inicio + Duración
           =========================== */}
        {!formData.precioManual && (
          <>
            {/* Hora inicio (AUTO) */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Hora inicio
              </label>
              <select
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none disabled:opacity-60 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData.horaInicio}
                onChange={(e) =>
                  setFormData({ ...formData, horaInicio: e.target.value })
                }
                disabled={!formData.canchaId || availableTimes.length === 0}
              >
                {!formData.canchaId && (
                  <option value="">Elegí una cancha</option>
                )}
                {formData.canchaId && availableTimes.length === 0 && (
                  <option value="">No hay horarios disponibles</option>
                )}
                {availableTimes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} (fin {t.finLabel})
                  </option>
                ))}
              </select>

              {horaFinCalculada && (
                <p className="text-xs text-slate-500 mt-1 pl-1">
                  Fin estimado:{" "}
                  <span className="font-bold text-slate-700">
                    {horaFinCalculada}
                  </span>
                </p>
              )}
            </div>

            {/* Duración (AUTO) */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">
                Duración
              </label>
              <select
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={Number(formData.duracion)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duracion: Number(e.target.value),
                  })
                }
              >
                {DURACIONES_AUTO.map((m) => (
                  <option key={m} value={m}>
                    {m} minutos
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1 ml-1">
                Múltiplos de 30 min (grilla).
              </p>
            </div>
          </>
        )}

        {/* ===========================
            MANUAL: Desde/Hasta + duración calculada
           =========================== */}
        {formData.precioManual && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <Clock className="w-4 h-4" /> Horario manual (Desde / Hasta)
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Desde */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Desde
                </label>
                <select
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none disabled:opacity-60 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  value={formData.horaInicioManual || ""}
                  onChange={(e) =>
                    setFormData((p: any) => ({
                      ...p,
                      horaInicioManual: e.target.value,
                      horaFinManual: "", // reseteamos hasta para forzar re-selección válida
                    }))
                  }
                  disabled={!formData.canchaId || manualDesdeOptions.length === 0}
                >
                  {!formData.canchaId && (
                    <option value="">Elegí una cancha</option>
                  )}
                  {formData.canchaId && manualDesdeOptions.length === 0 && (
                    <option value="">No hay horarios libres</option>
                  )}
                  {manualDesdeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hasta */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Hasta
                </label>
                <select
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none disabled:opacity-60 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  value={formData.horaFinManual || ""}
                  onChange={(e) =>
                    setFormData((p: any) => ({
                      ...p,
                      horaFinManual: e.target.value,
                    }))
                  }
                  disabled={
                    !formData.horaInicioManual || manualHastaOptions.length === 0
                  }
                >
                  {!formData.horaInicioManual && (
                    <option value="">Elegí “Desde”</option>
                  )}
                  {formData.horaInicioManual && manualHastaOptions.length === 0 && (
                    <option value="">No hay “Hasta” válido</option>
                  )}
                  {manualHastaOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duración calculada */}
            <div className="flex items-center justify-between rounded-xl bg-white border border-amber-200 px-3 py-2">
              <div className="text-xs font-semibold text-slate-600">
                Duración calculada
              </div>
              <div className="text-sm font-black text-slate-800">
                {duracionManualCalculada ? `${duracionManualCalculada} min` : "—"}
              </div>
            </div>

            {/* Precio manual */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Precio manual
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={Number(formData.precio || 0)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    precio: Number(e.target.value || 0),
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                placeholder="Ej: 12000"
              />
            </div>
          </div>
        )}

        {/* Precio (display general) */}
        <div
          className={`bg-slate-50 p-3 rounded-xl border border-slate-100 ${
            esFijo ? "opacity-70 grayscale" : ""
          }`}
        >
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            Total {esFijo ? "(Referencia)" : ""}
          </label>

          <div className="flex items-center gap-3">
            <div className="text-xl font-black text-slate-800 tracking-tight">
              {formatMoney(formData.precio)}
            </div>

            {/* ✅ Loader solo si NO es fijo y NO es manual */}
            {!esFijo && !formData.precioManual && priceLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
          </div>

          {/* ✅ Error solo si NO es fijo y NO es manual */}
          {!esFijo && !formData.precioManual && priceError && (
            <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-100">
              <AlertCircle className="w-3.5 h-3.5" /> {priceError}
            </div>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">
            Notas Internas
          </label>
          <textarea
            rows={3}
            value={formData.notas}
            onChange={(e) =>
              setFormData({ ...formData, notas: e.target.value })
            }
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
            placeholder="Detalles adicionales del turno..."
          />
        </div>

        {/* Error Global */}
        {createError && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{createError}</span>
          </div>
        )}
      </div>
    </form>
  );
}
