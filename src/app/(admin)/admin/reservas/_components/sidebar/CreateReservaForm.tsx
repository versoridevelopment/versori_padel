"use client";

import { useState, useEffect } from "react";
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
  MapPin,
  Tag,
} from "lucide-react";
import { formatMoney } from "../hooks/useReservaSidebar";
import type { CanchaUI } from "../types";
import { getTipoTurnoConfig } from "../types";
import ClientSearchInput from "./ClientSearchInput";

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
  availableTimes: { value: string; label: string; finLabel: string }[];
  manualDesdeOptions: { value: string; label: string }[];
  manualHastaOptions: { value: string; label: string }[];
  duracionManualCalculada: number;
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
  const [checking, setChecking] = useState(false); // ✅ Estado para el loader del teléfono
  const [matchFound, setMatchFound] = useState<string | null>(null);

  const esFijo = !!formData.esTurnoFijo;

  const TIPOS_DISPONIBLES = [
    "Normal",
    "Fijo",
    "Profesor",
    "Torneo",
    "Escuela",
    "Cumpleaños",
    "Abonado",
  ];

  useEffect(() => {
    if (formData.tipoTurno === "fijo") {
      setFormData((p: any) => ({
        ...p,
        esTurnoFijo: true,
        weeksAhead: Math.max(1, Number(p.weeksAhead || 8)),
      }));
    } else {
      setFormData((p: any) => ({
        ...p,
        esTurnoFijo: false,
      }));
    }
  }, [formData.tipoTurno, setFormData]);

  // ✅ NUEVA FUNCIÓN: Verifica si el teléfono ya existe en clientes_manuales
  const checkExistingUserByPhone = async (phone: string) => {
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 6) return;

    setChecking(true);
    try {
      const res = await fetch(
        `/api/admin/clientes/search?q=${cleanPhone}&id_club=${idClub}&type=manual`,
      );
      const json = await res.json();
      const results = json.results || [];

      if (results.length > 0) {
        // Encontramos una coincidencia exacta o cercana por teléfono
        const match = results[0];
        setFormData((prev: any) => ({
          ...prev,
          nombre: match.nombre,
          email: match.email || prev.email,
          telefono: cleanPhone, // Guardamos el limpio
        }));
        setMatchFound(`Cliente recuperado: ${match.nombre}`);
        setTimeout(() => setMatchFound(null), 3000);
      }
    } catch (e) {
      console.error("Error verificando teléfono:", e);
    } finally {
      setChecking(false);
    }
  };

  const toggleFijo = (checked: boolean) => {
    if (formData.tipoTurno === "fijo") return;
    setFormData((p: any) => ({
      ...p,
      esTurnoFijo: checked,
      weeksAhead: Math.max(1, Number(p.weeksAhead || 8)),
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
    if (cliente.telefono) {
      setMatchFound("Historial recuperado");
      setTimeout(() => setMatchFound(null), 3000);
    }
  };

  const currentTypeConfig = getTipoTurnoConfig(formData.tipoTurno);

  return (
    <form className="space-y-6 pb-20" onSubmit={(e) => e.preventDefault()}>
      {/* ENCABEZADO */}
      <div
        className={`
          -mt-6 -mx-6 px-6 py-4 mb-6 border-b-[5px] flex items-center justify-between transition-all duration-300
          ${currentTypeConfig.bg} ${currentTypeConfig.border.replace("border-l-", "border-b-")} 
          ${currentTypeConfig.text}
        `}
      >
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 opacity-70" />
          <span className="text-xl font-black uppercase tracking-tighter">
            Turno {currentTypeConfig.label}
          </span>
        </div>
      </div>

      {/* SECCIÓN JUGADOR */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4 relative">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" /> Datos del Jugador
        </h3>

        <div className="space-y-3">
          <ClientSearchInput
            idClub={idClub}
            initialValue={formData.nombre}
            onSelect={handleClientSelect}
          />

          <div className="relative group">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              Teléfono
            </label>
            <div className="relative">
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                onBlur={(e) => checkExistingUserByPhone(e.target.value)} // ✅ EJECUTA LA VERIFICACIÓN AL SALIR
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm font-mono"
                placeholder="Ej: 3794123456"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {checking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>
        </div>

        {matchFound && (
          <div className="flex items-center gap-2 p-2 bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 animate-in fade-in zoom-in-95">
            <Check className="w-3 h-3" /> {matchFound}
          </div>
        )}
      </div>

      {/* CATEGORÍA DEL TURNO */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-3 ml-1">
          Categoría del Turno
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS_DISPONIBLES.map((tipo) => {
            const v = tipo.toLowerCase().replace("ñ", "n");
            const isSelected = formData.tipoTurno === v;
            const config = getTipoTurnoConfig(v);

            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setFormData({ ...formData, tipoTurno: v })}
                className={`py-2.5 px-1 rounded-xl text-[10px] font-black uppercase tracking-tight border-2 transition-all active:scale-90
                  ${
                    isSelected
                      ? `${config.bg} ${config.text} ${config.border.replace("border-l-", "border-")} shadow-md scale-105 z-10`
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                  }`}
              >
                {tipo}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {/* Cancha */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Cancha
          </label>
          <select
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
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

        {/* Turno Fijo */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <label
            className={`flex items-center gap-2 text-sm font-bold text-slate-700 ${formData.tipoTurno === "fijo" ? "cursor-default" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              checked={esFijo}
              disabled={formData.tipoTurno === "fijo"}
              onChange={(e) => toggleFijo(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            Generar serie semanal
            {formData.tipoTurno === "fijo" && (
              <span className="text-[10px] text-blue-600 ml-auto">
                Obligatorio
              </span>
            )}
          </label>

          {esFijo && (
            <div className="mt-3 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-300">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Semanas
                </span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={Number(formData.weeksAhead || 8)}
                  onChange={(e) =>
                    setFormData((p: any) => ({
                      ...p,
                      weeksAhead: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Fin (Opcional)
                </span>
                <input
                  type="date"
                  value={formData.endDate || ""}
                  onChange={(e) =>
                    setFormData((p: any) => ({ ...p, endDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Manual Check */}
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
          <input
            type="checkbox"
            checked={!!formData.precioManual}
            onChange={(e) =>
              setFormData((p: any) => ({
                ...p,
                precioManual: e.target.checked,
                precio: p.precio || 0,
              }))
            }
            className="w-3.5 h-3.5 rounded text-orange-500"
          />
          MODO MANUAL (PRECIO Y HORARIO LIBRE)
        </label>

        {/* Horarios */}
        {!formData.precioManual ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                HORA INICIO
              </label>
              <select
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                value={formData.horaInicio}
                onChange={(e) =>
                  setFormData({ ...formData, horaInicio: e.target.value })
                }
              >
                {availableTimes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                DURACIÓN
              </label>
              <select
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                value={Number(formData.duracion)}
                onChange={(e) =>
                  setFormData({ ...formData, duracion: Number(e.target.value) })
                }
              >
                {DURACIONES_AUTO.map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-orange-700 uppercase">
                  Desde
                </label>
                <select
                  className="w-full p-2 rounded-lg border border-orange-200 text-sm"
                  value={formData.horaInicioManual || ""}
                  onChange={(e) =>
                    setFormData((p: any) => ({
                      ...p,
                      horaInicioManual: e.target.value,
                      horaFinManual: "",
                    }))
                  }
                >
                  {manualDesdeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-orange-700 uppercase">
                  Hasta
                </label>
                <select
                  className="w-full p-2 rounded-lg border border-orange-200 text-sm"
                  value={formData.horaFinManual || ""}
                  onChange={(e) =>
                    setFormData((p: any) => ({
                      ...p,
                      horaFinManual: e.target.value,
                    }))
                  }
                >
                  {manualHastaOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-orange-700 uppercase">
                Precio Total
              </label>
              <input
                type="number"
                value={Number(formData.precio || 0)}
                onChange={(e) =>
                  setFormData({ ...formData, precio: Number(e.target.value) })
                }
                className="w-full p-2 rounded-lg border border-orange-200 text-sm font-bold"
              />
            </div>
          </div>
        )}

        {/* Total Display */}
        <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl text-white shadow-lg">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total a Pagar
            </span>
            <div className="text-2xl font-black">
              {formatMoney(formData.precio)}
            </div>
          </div>
          {priceLoading && (
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          )}
        </div>

        {createError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {createError}
          </div>
        )}
      </div>
    </form>
  );
}
