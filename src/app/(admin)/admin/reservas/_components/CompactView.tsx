"use client";

import { Cancha, Reserva, THEME_COLORS } from "./types";

interface Props {
  canchas: Cancha[];
  reservas: Reserva[];
  onReservaClick: (r: Reserva) => void;
  // CAMBIO: Ahora recibimos la hora exacta del click
  onEmptySlotClick: (canchaId: number, time: number) => void;
}

const START_HOUR = 8;
const END_HOUR = 26; // 02:00 AM
const PIXELS_PER_HOUR = 140;
const GRID_TOP_OFFSET = 30;

export default function CompactView({
  canchas,
  reservas,
  onReservaClick,
  onEmptySlotClick,
}: Props) {
  const timeSlots: number[] = [];
  for (let i = START_HOUR; i <= END_HOUR; i += 0.5) {
    timeSlots.push(i);
  }

  // Helper para posición y altura (Igual que antes)
  const timeStringToDecimal = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    let decimal = h + m / 60;
    if (decimal < START_HOUR) decimal += 24;
    return decimal;
  };

  const getTopPosition = (startStr: string) => {
    const hours = timeStringToDecimal(startStr);
    return (hours - START_HOUR) * PIXELS_PER_HOUR + GRID_TOP_OFFSET;
  };

  const getHeight = (startStr: string, endStr: string) => {
    const startDec = timeStringToDecimal(startStr);
    const endDec = timeStringToDecimal(endStr);
    return (endDec - startDec) * PIXELS_PER_HOUR;
  };

  const formatHourLabel = (val: number) => {
    let h = Math.floor(val);
    const m = val % 1 === 0.5 ? "30" : "00";
    if (h >= 24) h -= 24;
    return `${h.toString().padStart(2, "0")}:${m}`;
  };

  const totalHeight =
    (END_HOUR - START_HOUR) * PIXELS_PER_HOUR + GRID_TOP_OFFSET + 50;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden select-none">
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <div className="flex min-w-max" style={{ height: totalHeight }}>
          {/* COLUMNA HORAS */}
          <div className="w-14 sticky left-0 z-30 bg-white border-r border-gray-200 flex-shrink-0 shadow-[4px_0_10px_rgba(0,0,0,0.05)]">
            <div className="h-12 border-b border-gray-200 bg-gray-50 sticky top-0 z-40" />
            <div className="relative h-full bg-slate-50/50">
              {timeSlots.map((time) => {
                if (!Number.isInteger(time)) return null;
                return (
                  <div
                    key={time}
                    className="absolute w-full text-center -mt-3"
                    style={{
                      top:
                        (time - START_HOUR) * PIXELS_PER_HOUR + GRID_TOP_OFFSET,
                    }}
                  >
                    <span className="text-xs font-black text-slate-400 block">
                      {formatHourLabel(time)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMNAS CANCHAS */}
          {canchas.map((cancha) => {
            const theme = THEME_COLORS[cancha.theme];

            return (
              <div
                key={cancha.id}
                className="flex-1 min-w-[160px] md:min-w-[200px] border-r border-gray-200 relative"
              >
                <div
                  className={`h-12 sticky top-0 z-20 flex items-center justify-center border-b border-gray-200 shadow-sm ${theme.header}`}
                >
                  <div className="text-center px-2">
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-wide leading-none truncate w-full">
                      {cancha.nombre}
                    </h3>
                    <p className="text-[9px] opacity-80 font-medium mt-0.5">
                      {cancha.superficie}
                    </p>
                  </div>
                </div>

                <div className="relative w-full h-full bg-white">
                  {/* Slots Vacíos Clickables */}
                  {timeSlots.map((time) => {
                    if (time === END_HOUR && !Number.isInteger(time))
                      return null;
                    return (
                      <div
                        key={time}
                        // CAMBIO: Pasamos la hora exacta del slot
                        onClick={() => onEmptySlotClick(cancha.id, time)}
                        className={`absolute w-full cursor-pointer hover:bg-slate-50 transition-colors ${Number.isInteger(time) ? "border-b border-gray-200" : "border-b border-gray-100 border-dashed"}`}
                        style={{
                          top:
                            (time - START_HOUR) * PIXELS_PER_HOUR +
                            GRID_TOP_OFFSET,
                          height: PIXELS_PER_HOUR / 2,
                        }}
                      />
                    );
                  })}

                  {/* Reservas (Igual que antes) */}
                  {reservas
                    .filter((r) => r.canchaId === cancha.id)
                    .map((reserva) => (
                      <div
                        key={reserva.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReservaClick(reserva);
                        }}
                        className={`absolute left-1 right-1 rounded-lg border-l-[6px] shadow-sm cursor-pointer 
                            hover:shadow-lg hover:z-20 hover:scale-[1.02] transition-all p-2 flex flex-col justify-center
                            ${theme.bg} ${theme.border} ${reserva.color} bg-opacity-95 backdrop-blur-sm
                        `}
                        style={{
                          top: getTopPosition(reserva.horaInicio),
                          height:
                            getHeight(reserva.horaInicio, reserva.horaFin) - 3,
                        }}
                      >
                        <div
                          className={`absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-white/50 ${reserva.estado === "confirmada" ? "bg-green-500" : "bg-orange-400"}`}
                        />
                        <span className="text-[10px] font-bold opacity-70 flex gap-1 mb-0.5">
                          {reserva.horaInicio} - {reserva.horaFin}
                        </span>
                        <h4 className="font-bold text-xs md:text-sm text-slate-800 leading-tight truncate">
                          {reserva.clienteNombre}
                        </h4>
                        <div className="mt-1 flex justify-between items-end">
                          <span className="text-[10px] bg-white/60 px-1.5 rounded text-slate-700 font-bold tracking-tight">
                            ${reserva.precioTotal.toLocaleString()}
                          </span>
                          {reserva.saldoPendiente > 0 && (
                            <span className="text-[8px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                              DEBE
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
