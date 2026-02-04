"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Lock,
  Globe,
  UserCog,
  StickyNote,
  Phone,
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
} from "lucide-react";
import { CanchaUI, ReservaUI, THEME_COLORS, getTipoTurnoConfig } from "./types";

interface Props {
  canchas: CanchaUI[];
  reservas: ReservaUI[];
  startHour: number;
  endHour: number;
  date: Date;
  isLoading?: boolean;
  onRefresh?: () => void;
  onReservaClick: (r: ReservaUI) => void;
  onEmptySlotClick: (
    canchaId: number,
    timeStr: string,
    dateStr: string,
  ) => void;
}

const PIXELS_PER_HOUR = 140;
const GRID_TOP_OFFSET = 30;

// --- FUNCIONES AUXILIARES ---

function getTargetDateISO(baseDate: Date, extraDays: number) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + extraDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const timeStringToDecimal = (
  timeStr: string | null | undefined,
  startHour: number,
) => {
  if (!timeStr || typeof timeStr !== "string") return NaN;
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return NaN;
  let decimal = h + m / 60;
  if (decimal < startHour) decimal += 24;
  return decimal;
};

function localMidnight(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function dayDiff(a: Date, b: Date) {
  // diferencia en días entre medianoches locales
  const ms = localMidnight(a).getTime() - localMidnight(b).getTime();
  return Math.round(ms / 86_400_000);
}

const formatHHMMFromDecimal = (decimal: number) => {
  let h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  if (h >= 24) h -= 24;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

function prettyTipoTurno(tipo?: string | null) {
  const t = String(tipo || "normal").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");
}

// ✅ Badge de estado (API)
function getEstadoReservaUI(reserva: ReservaUI) {
  const estado = String(reserva.estado || "").toLowerCase();

  if (estado === "confirmada") {
    return {
      label: "Confirmada",
      className: "bg-emerald-100 text-emerald-800",
      icon: <CheckCircle2 size={10} />,
    };
  }

  if (estado === "pendiente_pago") {
    return {
      label: "Pendiente pago",
      className: "bg-blue-100 text-blue-800",
      icon: <CircleDollarSign size={10} />,
    };
  }

  if (estado === "expirada") {
    return {
      label: "Expirada",
      className: "bg-slate-200 text-slate-700",
      icon: <AlertCircle size={10} />,
    };
  }

  if (estado === "rechazada") {
    return {
      label: "Rechazada",
      className: "bg-red-100 text-red-800",
      icon: <AlertCircle size={10} />,
    };
  }

  if (estado === "cancelada") {
    return {
      label: "Cancelada",
      className: "bg-orange-100 text-orange-800",
      icon: <AlertCircle size={10} />,
    };
  }

  // fallback
  return {
    label: estado ? estado.replace(/_/g, " ") : "Sin estado",
    className: "bg-slate-100 text-slate-700",
    icon: <AlertCircle size={10} />,
  };
}

export default function CompactView({
  canchas = [],
  reservas = [],
  startHour = 8,
  endHour = 24,
  date,
  isLoading = false,
  onRefresh,
  onReservaClick,
  onEmptySlotClick,
}: Props) {
  const timeSlots: number[] = [];
  for (let i = startHour; i <= endHour; i += 0.5) timeSlots.push(i);

  const getTopPosition = (startStr: string) => {
    const hours = timeStringToDecimal(startStr, startHour);
    if (isNaN(hours)) return GRID_TOP_OFFSET;
    return (hours - startHour) * PIXELS_PER_HOUR + GRID_TOP_OFFSET;
  };

  const getHeight = (startStr: string, endStr: string) => {
    const startDec = timeStringToDecimal(startStr, startHour);
    const endDec = timeStringToDecimal(endStr, startHour);
    if (isNaN(startDec) || isNaN(endDec)) return 50;
    return (endDec - startDec) * PIXELS_PER_HOUR;
  };

  const getCierreStyle = (inicioStr: string, finStr: string) => {
    const s = timeStringToDecimal(inicioStr, startHour);
    const e = timeStringToDecimal(finStr, startHour);
    if (isNaN(s) || isNaN(e)) return null;
    if (e <= startHour || s >= endHour) return null;
    const visibleStart = Math.max(s, startHour);
    const visibleEnd = Math.min(e, endHour);
    const duration = visibleEnd - visibleStart;
    if (duration <= 0) return null;
    return {
      top: (visibleStart - startHour) * PIXELS_PER_HOUR + GRID_TOP_OFFSET,
      height: duration * PIXELS_PER_HOUR,
    };
  };

  const isSlotBlocked = (cancha: CanchaUI, timeDecimal: number) => {
    if (!cancha.cierres) return false;
    return cancha.cierres.some((cierre) => {
      const s = timeStringToDecimal(cierre.inicio, startHour);
      const e = timeStringToDecimal(cierre.fin, startHour);
      if (isNaN(s) || isNaN(e)) return false;
      return timeDecimal >= s && timeDecimal < e;
    });
  };

  const formatHourLabel = (val: number) => {
    let h = Math.floor(val);
    const m = val % 1 === 0.5 ? "30" : "00";
    if (h >= 24) h -= 24;
    return `${h.toString().padStart(2, "0")}:${m}`;
  };

  const totalHeight =
    (endHour - startHour) * PIXELS_PER_HOUR + GRID_TOP_OFFSET + 50;

  // =========================
  // ✅ BARRA "HORA ACTUAL"
  // =========================
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const nowLine = useMemo(() => {
    const now = new Date();

    // Rango visible "operativo" de esta agenda
    let end = endHour;
    if (end <= startHour) end += 24;

    const offsetDays = dayDiff(now, date);

    const dec = now.getHours() + now.getMinutes() / 60 + offsetDays * 24;

    if (dec < startHour || dec > end) return null;

    const top = (dec - startHour) * PIXELS_PER_HOUR + GRID_TOP_OFFSET;
    const label = formatHHMMFromDecimal(dec);

    return { top, label };
  }, [tick, date, startHour, endHour]);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden select-none ring-1 ring-slate-100">
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-slate-50/30">
        <div className="flex min-w-max" style={{ height: totalHeight }}>
          {/* COLUMNA HORAS */}
          <div className="w-16 sticky left-0 z-30 bg-white border-r border-slate-200 flex-shrink-0">
            <div className="h-12 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-center p-1"></div>
            <div className="relative h-full">
              {timeSlots.map((time) => {
                if (!Number.isInteger(time)) return null;
                return (
                  <div
                    key={time}
                    className="absolute w-full text-center -mt-3"
                    style={{
                      top:
                        (time - startHour) * PIXELS_PER_HOUR + GRID_TOP_OFFSET,
                    }}
                  >
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {formatHourLabel(time)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LINEA DE TIEMPO ACTUAL */}
          {nowLine && (
            <div
              className="absolute left-16 right-0 z-[25] pointer-events-none"
              style={{ top: nowLine.top }}
            >
              <div className="relative">
                <div className="h-[3px] bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]" />
                <div className="absolute right-3 -top-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 shadow-lg ring-2 ring-white/80">
                    {nowLine.label}
                    <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* COLUMNAS CANCHAS */}
          {canchas.map((cancha) => {
            const theme = THEME_COLORS[cancha.theme] || THEME_COLORS.blue;
            const reservasCancha =
              cancha.reservas && cancha.reservas.length > 0
                ? cancha.reservas
                : reservas.filter((r) => r.id_cancha === cancha.id_cancha);

            return (
              <div
                key={cancha.id_cancha}
                className="flex-1 min-w-[200px] md:min-w-[240px] border-r border-slate-100 relative group/col"
              >
                {/* Header Cancha */}
                <div
                  className={`h-12 sticky top-0 z-20 flex items-center justify-center border-b border-slate-200/80 shadow-sm backdrop-blur-md ${theme.header}`}
                >
                  <div className="text-center px-3">
                    <h3 className="text-xs md:text-sm font-bold uppercase tracking-tight truncate">
                      {cancha.nombre}
                    </h3>
                  </div>
                </div>

                <div className="relative w-full h-full bg-white group-hover/col:bg-slate-50/30 transition-colors">
                  {/* CIERRES */}
                  {cancha.cierres?.map((cierre) => {
                    const style = getCierreStyle(cierre.inicio, cierre.fin);
                    if (!style) return null;
                    const cierreLabel =
                      typeof cierre.motivo === "string" && cierre.motivo.trim()
                        ? cierre.motivo
                        : "CERRADO";

                    return (
                      <div
                        key={cierre.id_cierre}
                        className="absolute left-0 right-0 z-10 flex flex-col items-center justify-center pointer-events-none border-y border-slate-300"
                        style={{
                          top: style.top,
                          height: style.height,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 10px, #d1d5db 10px, #d1d5db 20px)",
                        }}
                      >
                        <div className="bg-white/90 px-2 py-1 rounded shadow-sm flex items-center gap-1 border border-slate-300">
                          <Lock size={12} className="text-slate-500" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[150px]">
                            {cierreLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* SLOTS VACÍOS */}
                  {timeSlots.map((time) => {
                    if (time === endHour && !Number.isInteger(time)) return null;
                    if (isSlotBlocked(cancha, time)) return null;

                    const isNextDay = time >= 24;
                    const slotDateISO = getTargetDateISO(date, isNextDay ? 1 : 0);

                    return (
                      <div
                        key={time}
                        onClick={() =>
                          onEmptySlotClick(
                            cancha.id_cancha,
                            formatHourLabel(time),
                            slotDateISO,
                          )
                        }
                        className={`absolute w-full cursor-pointer hover:bg-blue-50/50 transition-colors z-0 ${
                          Number.isInteger(time)
                            ? "border-b border-slate-200"
                            : "border-b border-slate-100 border-dashed"
                        }`}
                        style={{
                          top:
                            (time - startHour) * PIXELS_PER_HOUR +
                            GRID_TOP_OFFSET,
                          height: PIXELS_PER_HOUR / 2,
                        }}
                      />
                    );
                  })}

                  {/* RESERVAS */}
                  {reservasCancha.map((reserva) => {
                    const saldo = Number(reserva.saldo_pendiente || 0);
                    const precio = Number(reserva.precio_total || 0);
                    const pagadoTotalmente = saldo <= 0;
                    const seña = saldo > 0 && saldo < precio;

                    const config = getTipoTurnoConfig(reserva.tipo_turno);

                    const origenIcon =
                      reserva.origen === "web" ? (
                        <Globe size={11} className="text-blue-500" />
                      ) : (
                        <UserCog size={11} className="text-amber-600" />
                      );

                    const hasNotes = !!(reserva.notas && reserva.notas.length > 0);
                    const hasPhone = !!(
                      reserva.cliente_telefono && reserva.cliente_telefono.length > 5
                    );

                    const estado = String(reserva.estado || "").toLowerCase();
                    const estadoUI = getEstadoReservaUI(reserva);
                    const isPendientePago = estado === "pendiente_pago";
                    const isInactiva =
                      estado === "expirada" ||
                      estado === "rechazada" ||
                      estado === "cancelada";

                    return (
                      <div
                        key={reserva.id_reserva}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReservaClick(reserva);
                        }}
                        className={`
                          absolute left-1 right-1 rounded-lg shadow-sm cursor-pointer z-20 
                          hover:shadow-md hover:scale-[1.01] hover:z-30 transition-all 
                          p-2 flex flex-col justify-between overflow-hidden group
                          ${config.bg} ${config.border} border-l-[4px] border-t border-r border-b border-gray-200/60
                          ${isPendientePago ? "ring-2 ring-blue-200" : ""}
                          ${isInactiva ? "opacity-60 grayscale-[0.2]" : ""}
                        `}
                        style={{
                          top: getTopPosition(reserva.horaInicio),
                          height: getHeight(reserva.horaInicio, reserva.horaFin) - 3,
                        }}
                        title={`${reserva.cliente_nombre} - ${config.label}${
                          hasNotes ? " - Ver notas" : ""
                        }`}
                      >
                        {/* HEADER: Rango Horario + Estado + Iconos */}
                        <div className="flex justify-between items-start text-[10px] leading-none mb-1 gap-2">
                          <span className="font-mono font-bold text-slate-700 bg-white/60 px-1.5 py-0.5 rounded border border-black/5 whitespace-nowrap">
                            {reserva.horaInicio} - {reserva.horaFin}
                          </span>

                          <div className="flex items-center gap-1.5 min-w-0">
                            {/* ✅ BADGE ESTADO RESERVA (API) */}
                            <span
                              className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] font-black uppercase whitespace-nowrap ${estadoUI.className}`}
                              title={`Estado reserva: ${estadoUI.label}`}
                            >
                              {estadoUI.icon}
                              {estadoUI.label}
                            </span>

                            <span className="text-slate-300">|</span>

                            {hasPhone && <Phone size={10} className="text-slate-400" />}
                            {hasNotes && (
                              <StickyNote
                                size={10}
                                className="text-amber-500 animate-pulse"
                              />
                            )}
                            <span className="text-slate-300">|</span>
                            {origenIcon}
                          </div>
                        </div>

                        {/* BODY: Nombre Cliente */}
                        <div className="flex-1 min-h-0 flex flex-col justify-center">
                          <span className="text-xs font-extrabold text-slate-800 truncate leading-tight w-full">
                            {reserva.cliente_nombre || "Cliente Final"}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-bold tracking-tight opacity-70 ${config.text}`}
                          >
                            {prettyTipoTurno(reserva.tipo_turno)}
                          </span>
                        </div>

                        {/* FOOTER: Estado de Pago (saldo) */}
                        <div className="flex justify-between items-end mt-1 pt-1.5 border-t border-black/5">
                          <div className="flex items-center gap-1">
                            {pagadoTotalmente ? (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-sm">
                                <CheckCircle2 size={10} /> Pagado
                              </span>
                            ) : seña ? (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm">
                                <CircleDollarSign size={10} /> Seña
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-sm">
                                <AlertCircle size={10} /> Impago
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            {saldo > 0 ? (
                              <span className="text-[10px] font-black text-red-600 block leading-none">
                                -{saldo.toLocaleString("es-AR")}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 block leading-none decoration-slate-300">
                                ${precio.toLocaleString("es-AR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
