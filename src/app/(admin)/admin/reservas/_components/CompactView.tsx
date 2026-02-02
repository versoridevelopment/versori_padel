"use client";

import { Lock, RefreshCw } from "lucide-react";
import { CanchaUI, ReservaUI, THEME_COLORS } from "./types";

interface Props {
  canchas: CanchaUI[];
  reservas: ReservaUI[];
  startHour: number;
  endHour: number;
  date: Date;
  isLoading?: boolean;
  onRefresh?: () => void;
  onReservaClick: (r: ReservaUI) => void;
  onEmptySlotClick: (canchaId: number, timeStr: string, dateStr: string) => void;
}

const PIXELS_PER_HOUR = 140;
const GRID_TOP_OFFSET = 30;

function getTargetDateISO(baseDate: Date, extraDays: number) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + extraDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ✅ FUNCIÓN CORREGIDA: Maneja errores de formato y evita NaN
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

function prettyTipoTurno(tipo?: string | null) {
  const t = String(tipo || "normal").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");
}

function tipoTurnoBadgeClass(tipo?: string | null) {
  const t = String(tipo || "normal").toLowerCase();
  if (t.includes("profesor"))
    return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (t.includes("torneo"))
    return "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200";
  if (t.includes("escuela")) return "bg-cyan-100 text-cyan-700 border-cyan-200";
  return "bg-white/80 text-slate-600 border-slate-200";
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

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden select-none ring-1 ring-slate-100">
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-slate-50/30">
        <div className="flex min-w-max" style={{ height: totalHeight }}>
          {/* COLUMNA HORAS */}
          <div className="w-16 sticky left-0 z-30 bg-white border-r border-slate-200 flex-shrink-0">
            <div className="h-12 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-center p-1">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className={`p-1.5 rounded-lg transition-all ${
                  isLoading
                    ? "animate-spin text-blue-500"
                    : "text-slate-400 hover:text-blue-600"
                }`}
              >
                <RefreshCw size={16} />
              </button>
            </div>
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
                className="flex-1 min-w-[180px] md:min-w-[220px] border-r border-slate-100 relative group/col"
              >
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
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            {cierre.motivo || "CERRADO"}
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
                    const slotDateISO = getTargetDateISO(
                      date,
                      isNextDay ? 1 : 0,
                    );

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
                    const tipoLabel = prettyTipoTurno(reserva.tipo_turno);

                    const saldo = Number((reserva as any).saldo_pendiente || 0);
                    const debe = saldo > 0;

                    return (
                      <div
                        key={reserva.id_reserva}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReservaClick(reserva);
                        }}
                        className={`absolute left-1 right-1 rounded-xl border-l-[4px] shadow-sm cursor-pointer z-20 hover:shadow-md hover:-translate-y-0.5 transition-all p-2 pr-10 flex flex-col justify-between ${theme.bg} ${theme.border} bg-opacity-95 backdrop-blur-sm`}
                        style={{
                          top: getTopPosition(reserva.horaInicio),
                          height:
                            getHeight(reserva.horaInicio, reserva.horaFin) - 3,
                        }}
                      >
                        {/* ✅ DEBE centrado a la derecha */}
                        {debe && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
                            <span className="inline-flex items-center rounded-full bg-red-600 text-white text-[9px] font-black px-2.5 py-1 shadow-lg ring-2 ring-white/80">
                              DEBE
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold opacity-80 bg-white/50 px-1.5 py-0.5 rounded">
                            {reserva.horaInicio} - {reserva.horaFin}
                          </span>

                          {/* ✅ Punto verde SOLO cuando NO debe (cuando desaparece DEBE) */}
                          {!debe && (
                            <div
                              className="w-2 h-2 rounded-full ring-2 ring-white bg-emerald-500"
                              title="Pagado"
                            />
                          )}
                        </div>

                        <h4 className="font-bold text-xs text-slate-800 truncate my-1">
                          {reserva.cliente_nombre}
                        </h4>

                        <div className="flex justify-between items-end">
                          <span
                            className={`text-[8px] px-1 rounded border uppercase ${tipoTurnoBadgeClass(
                              reserva.tipo_turno,
                            )}`}
                          >
                            {tipoLabel}
                          </span>

                          <span className="text-[10px] font-extrabold text-slate-700">
                            $
                            {Number(reserva.precio_total).toLocaleString(
                              "es-AR",
                            )}
                          </span>
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
