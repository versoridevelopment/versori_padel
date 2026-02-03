"use client";

import {
  Lock,
  RefreshCw,
  Repeat,
  Globe,
  UserCog,
  Phone,
  StickyNote,
  AlertCircle,
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
                  {/* CIERRES (Bloqueos) */}
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

                  {/* SLOTS VACÍOS (Clickeables) */}
                  {timeSlots.map((time) => {
                    if (time === endHour && !Number.isInteger(time))
                      return null;
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

                  {/* RESERVAS (Cards Mejoradas) */}
                  {reservasCancha.map((reserva) => {
                    const saldo = Number(reserva.saldo_pendiente || 0);
                    const precioTotal = Number(reserva.precio_total);
                    const debe = saldo > 0;
                    const isFijo = reserva.tipo_turno?.toLowerCase() === "fijo";

                    // ✅ Configuración visual por tipo (Obtenida del types.ts actualizado)
                    const config = getTipoTurnoConfig(reserva.tipo_turno);

                    const origenIcon =
                      reserva.origen === "web" ? (
                        <Globe size={12} />
                      ) : (
                        <UserCog size={12} />
                      );
                    const hasPhone =
                      reserva.cliente_telefono &&
                      reserva.cliente_telefono.length > 5;
                    const hasNotes = reserva.notas && reserva.notas.length > 0;

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
                          p-2 flex flex-col justify-between overflow-hidden
                          ${config.bg} ${config.border} border-l-[5px] border-t border-r border-b border-gray-200/60
                        `}
                        style={{
                          top: getTopPosition(reserva.horaInicio),
                          height:
                            getHeight(reserva.horaInicio, reserva.horaFin) - 3,
                        }}
                      >
                        {/* --- HEADER: Hora + ID --- */}
                        <div className="flex justify-between items-start text-[10px] leading-none mb-1">
                          <span className="font-mono font-bold text-slate-700 bg-white/50 px-1.5 py-0.5 rounded border border-black/5">
                            {reserva.horaInicio} - {reserva.horaFin}
                          </span>
                          <div className="flex items-center gap-1 opacity-60 text-slate-900">
                            {origenIcon}
                            <span className="tracking-tighter font-mono font-medium">
                              #{reserva.id_reserva}
                            </span>
                          </div>
                        </div>

                        {/* --- BODY: Cliente + Iconos --- */}
                        <div className="flex-1 flex flex-col justify-center min-h-0 pl-0.5">
                          <h4
                            className={`font-bold text-xs leading-tight truncate ${config.text}`}
                          >
                            {reserva.cliente_nombre}
                          </h4>

                          {/* Iconos de metadatos */}
                          {(hasPhone || hasNotes || isFijo) && (
                            <div className="flex items-center gap-2 mt-1">
                              {isFijo && (
                                <div className="flex items-center gap-0.5 text-[9px] font-black uppercase text-slate-700 bg-slate-300/50 px-1 rounded">
                                  <Repeat size={10} /> Fijo
                                </div>
                              )}
                              {hasPhone && (
                                <Phone size={11} className="text-slate-500" />
                              )}
                              {hasNotes && (
                                <StickyNote
                                  size={11}
                                  className="text-amber-600"
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* --- FOOTER: Precio / Deuda --- */}
                        <div className="flex justify-between items-end mt-1 pt-1 border-t border-black/5">
                          {/* Etiqueta del tipo (si no es fijo, para no duplicar info visual) */}
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wide opacity-80 ${config.text}`}
                          >
                            {!isFijo && config.label}
                          </span>

                          {/* Precio / Deuda */}
                          <div className="text-right">
                            {debe ? (
                              <div className="flex items-center gap-1 text-rose-700 font-black text-[11px] bg-rose-100/80 px-1.5 py-0.5 rounded shadow-sm border border-rose-200">
                                <AlertCircle size={11} />$
                                {saldo.toLocaleString("es-AR")}
                              </div>
                            ) : (
                              <div className="font-bold text-slate-500 text-[10px]">
                                ${precioTotal.toLocaleString("es-AR")}
                              </div>
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
