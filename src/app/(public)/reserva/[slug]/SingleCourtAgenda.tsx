"use client";

import { memo, useMemo } from "react";
import { Lock } from "lucide-react";

export type SlotPoint = {
  absMin: number;
  time: string;
  dayOffset: 0 | 1;

  // ✅ estilo admin: boundaries
  canStart: boolean;
  canEnd: boolean;

  reason: null | "reservado" | "bloqueado";
};

type Props = {
  slots: SlotPoint[];
  canchaNombre?: string;

  // selección por CELDAS (inicio de cada bloque de 30m)
  selectedAbs: number[]; // ej: [720, 750] => 12:00–13:00
  anchorAbs: number | null; // inicio seleccionado esperando fin
  validEndAbsSet: Set<number>; // últimas celdas válidas

  onSelect: (absMin: number) => void;

  primaryCssVar?: string; // "var(--primary)"
};

const PIXELS_PER_HOUR = 140;
const PX_PER_MIN = PIXELS_PER_HOUR / 60;
const GRID_TOP_OFFSET = 28;
const CELL_MIN = 30;

function fmtHourFromAbs(absMin: number) {
  let total = absMin;
  while (total >= 1440) total -= 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildMarks(minAbs: number, maxAbs: number) {
  // grilla 30m
  const start = Math.floor(minAbs / 30) * 30;
  const end = Math.ceil(maxAbs / 30) * 30;

  const marks: number[] = [];
  for (let m = start; m <= end; m += 30) marks.push(m);
  return marks;
}

function SingleCourtAgenda({
  slots,
  canchaNombre,
  selectedAbs,
  anchorAbs,
  validEndAbsSet,
  onSelect,
  primaryCssVar = "var(--primary)",
}: Props) {
  const sorted = useMemo(() => [...slots].sort((a, b) => a.absMin - b.absMin), [slots]);

  const { minAbs, maxAbs, slotMap } = useMemo(() => {
    const map = new Map<number, SlotPoint>();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (const s of sorted) {
      map.set(s.absMin, s);
      min = Math.min(min, s.absMin);
      max = Math.max(max, s.absMin);
    }

    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 0;

    return { minAbs: min, maxAbs: max, slotMap: map };
  }, [sorted]);

  const marks = useMemo(() => buildMarks(minAbs, maxAbs), [minAbs, maxAbs]);

  const totalHeight = useMemo(() => {
    const h = (maxAbs - minAbs) * PX_PER_MIN + GRID_TOP_OFFSET + 40;
    return Math.max(420, h);
  }, [minAbs, maxAbs]);

  const hasSelection = selectedAbs.length >= 1;
  const startAbs = hasSelection ? selectedAbs[0] : null;
  const lastCellAbs = hasSelection ? selectedAbs[selectedAbs.length - 1] : null;

  const endBoundaryAbs =
    startAbs != null && lastCellAbs != null ? lastCellAbs + CELL_MIN : null;

  const selectionTop = startAbs != null ? (startAbs - minAbs) * PX_PER_MIN + GRID_TOP_OFFSET : 0;

  const selectionHeight =
    startAbs != null && endBoundaryAbs != null
      ? Math.max(6, (endBoundaryAbs - startAbs) * PX_PER_MIN)
      : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-bold">
            Agenda
          </span>
          <span className="text-sm font-semibold text-white">{canchaNombre || "Cancha"}</span>
        </div>

        <div className="text-[11px] text-neutral-400 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500/25 border border-emerald-500/50" />
            Libre
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-black/40 border border-white/10 grid place-items-center">
              <Lock className="w-2.5 h-2.5 opacity-60" />
            </span>
            Ocupado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: primaryCssVar }} />
            Selección
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="h-[560px] sm:h-[620px] overflow-auto relative">
          <div className="min-w-[320px] relative" style={{ height: totalHeight }}>
            <div className="flex">
              {/* horas */}
              <div className="w-16 sticky left-0 z-30 bg-[#0b1220]/70 backdrop-blur border-r border-white/10">
                <div className="h-10 sticky top-0 z-40 bg-[#0b1220]/80 border-b border-white/10" />
                <div className="relative" style={{ height: totalHeight }}>
                  {marks.map((m) => {
                    if (m % 60 !== 0) return null;
                    const top = (m - minAbs) * PX_PER_MIN + GRID_TOP_OFFSET;
                    return (
                      <div
                        key={`h-${m}`}
                        className="absolute left-0 right-0 -mt-3 text-center"
                        style={{ top }}
                      >
                        <span className="text-[11px] font-black text-neutral-400">
                          {fmtHourFromAbs(m)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* cancha */}
              <div className="flex-1 relative">
                <div className="h-10 sticky top-0 z-20 bg-[#0b1220]/55 backdrop-blur border-b border-white/10 flex items-center px-3">
                  <div className="text-xs text-neutral-300 font-semibold">
                    Disponibilidad (toques: inicio → fin)
                  </div>
                </div>

                <div className="relative" style={{ height: totalHeight }}>
                  {/* overlay selección */}
                  {hasSelection && startAbs != null && endBoundaryAbs != null && (
                    <div
                      className="absolute left-2 right-2 rounded-xl border shadow-[0_0_18px_rgba(0,0,0,0.25)]"
                      style={{
                        top: selectionTop,
                        height: selectionHeight,
                        borderColor: primaryCssVar,
                        background: `linear-gradient(180deg, ${primaryCssVar}33, ${primaryCssVar}22)`,
                      }}
                    />
                  )}

                  {marks.map((m) => {
                    const sl = slotMap.get(m);
                    const top = (m - minAbs) * PX_PER_MIN + GRID_TOP_OFFSET;
                    const height = CELL_MIN * PX_PER_MIN;

                    if (!sl) {
                      return (
                        <div
                          key={`line-${m}`}
                          className="absolute left-0 right-0 border-b border-white/5"
                          style={{ top, height }}
                        />
                      );
                    }

                    // ✅ celda libre si puede START y no tiene reason
                    const isBlocked = !sl.canStart || !!sl.reason;
                    const isSelected = selectedAbs.includes(sl.absMin);
                    const isValidEnd = anchorAbs !== null && validEndAbsSet.has(sl.absMin);

                    const baseRow =
                      "absolute left-0 right-0 border-b border-white/5 px-3 flex items-center";

                    if (isBlocked) {
                      return (
                        <div key={`blk-${sl.absMin}`} className={`${baseRow} opacity-50`} style={{ top, height }}>
                          <div className="flex items-center gap-2 text-neutral-500 text-xs">
                            <span className="w-7 h-7 rounded-lg bg-black/30 border border-white/10 grid place-items-center">
                              <Lock className="w-4 h-4 opacity-70" />
                            </span>
                            <div className="flex flex-col leading-tight">
                              <span className="font-semibold">Ocupado</span>
                              <span className="text-[10px] uppercase tracking-wider opacity-70">
                                No disponible
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    let pillText = "Elegir";
                    if (isSelected) {
                      pillText =
                        sl.absMin === selectedAbs[0]
                          ? "Inicio"
                          : sl.absMin === selectedAbs[selectedAbs.length - 1]
                          ? "Fin"
                          : "Selección";
                    } else if (isValidEnd) {
                      pillText = "Elegir fin";
                    }

                    return (
                      <button
                        type="button"
                        key={`ok-${sl.absMin}`}
                        onClick={() => onSelect(sl.absMin)}
                        className={`${baseRow} hover:bg-white/5 text-left transition-colors`}
                        style={{ top, height }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: isSelected ? primaryCssVar : "rgba(255,255,255,0.25)",
                              boxShadow: isSelected ? `0 0 12px ${primaryCssVar}` : "none",
                            }}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <div className="flex flex-col leading-tight">
                              <span className="text-sm font-bold text-white/90">Libre</span>
                              <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                                Disponible
                              </span>
                            </div>

                            <span
                              className="px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all"
                              style={
                                isSelected
                                  ? {
                                      background: primaryCssVar,
                                      borderColor: primaryCssVar,
                                      boxShadow: `0 0 18px ${primaryCssVar}55`,
                                      color: "white",
                                    }
                                  : isValidEnd
                                  ? {
                                      background: "rgba(16,185,129,0.10)",
                                      borderColor: "rgba(16,185,129,0.40)",
                                      color: "rgba(209,250,229,1)",
                                    }
                                  : {
                                      background: "rgba(255,255,255,0.04)",
                                      borderColor: "rgba(255,255,255,0.10)",
                                      color: "rgba(226,232,240,1)",
                                    }
                              }
                            >
                              {pillText}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0b1220] to-transparent opacity-60" />
      </div>
    </div>
  );
}

export default memo(SingleCourtAgenda);
