"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, AlertTriangle, Clock, Lock, ArrowLeft } from "lucide-react";
import type { Club } from "@/lib/ObetenerClubUtils/getClubBySubdomain"; 

// --- TIPOS ---

type Segmento = "publico" | "profe";

type CanchaUI = {
  id_cancha: number;
  nombre: string;
  descripcion: string;
  imagen: string;
  es_exterior: boolean;
};

type PrecioPreviewOk = {
  ok: true;
  precio_total: number;
  duracion_min: number;
  id_regla: number;
  id_tarifario: number;
  segmento?: Segmento;
};

type PrecioPreviewErr = { ok?: false; error: string };

type Slot = {
  absMin: number;
  time: string;
  dayOffset: 0 | 1;
  available?: boolean;
  reason?: "reservado" | "bloqueado";
};

type DaySlots = {
  label: string;
  dateISO: string;
  slots: Slot[];
  durations_allowed: number[];
  segmento?: Segmento;
};

// --- HELPERS ---

function addDaysISO(dateISO: string, add: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + add);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// (Se eliminaron las funciones 'pad2' y 'absToHHMM' para corregir la advertencia de "unused")

// --- COMPONENTE PRINCIPAL ---

export default function ReservaCanchaClient({
  club,
  cancha,
}: {
  club: Club; 
  cancha: CanchaUI;
}) {
  const router = useRouter();

  // Estados de datos
  const [availableDays, setAvailableDays] = useState<DaySlots[]>([]);
  const [openDateISO, setOpenDateISO] = useState<string>("");
  const [openDayLabel, setOpenDayLabel] = useState<string>("Hoy");
  const [showDays, setShowDays] = useState(false);
  const [segmentoActual, setSegmentoActual] = useState<Segmento>("publico");

  // Estados de selección
  const [anchorAbs, setAnchorAbs] = useState<number | null>(null);
  const [selectedAbs, setSelectedAbs] = useState<number[]>([]);
  const [validEndAbsSet, setValidEndAbsSet] = useState<Set<number>>(new Set());
  const [warning, setWarning] = useState<string | null>(null);

  // Estados de precio
  const [priceLoading, setPriceLoading] = useState(false);
  const [pricePreview, setPricePreview] = useState<PrecioPreviewOk | PrecioPreviewErr | null>(null);

  // -- Computados básicos --

  const openDay = useMemo(() => {
    return availableDays.find((d) => d.dateISO === openDateISO) || null;
  }, [availableDays, openDateISO]);

  const durationsAllowed = useMemo(() => {
    return (openDay?.durations_allowed?.length ? openDay.durations_allowed : [60, 90, 120]) as number[];
  }, [openDay]);

  const slotsByAbs = useMemo(() => {
    const map = new Map<number, Slot>();
    for (const s of openDay?.slots || []) map.set(s.absMin, s);
    return map;
  }, [openDay]);

  const allAbsSorted = useMemo(() => {
    return (openDay?.slots || []).map((s) => s.absMin).sort((a, b) => a - b);
  }, [openDay]);

  // -- Selección y Validación --

  const hasValidSelection = selectedAbs.length >= 2;
  const startAbs = hasValidSelection ? selectedAbs[0] : null;
  const endAbs = hasValidSelection ? selectedAbs[selectedAbs.length - 1] : null;
  const durationMinutes =
    hasValidSelection && startAbs != null && endAbs != null ? endAbs - startAbs : 0;
  const durationOk = durationsAllowed.includes(durationMinutes);

  const startSlot = startAbs != null ? slotsByAbs.get(startAbs) : null;
  const endSlot = endAbs != null ? slotsByAbs.get(endAbs) : null;
  const startTime = startSlot?.time ?? null;
  const endTime = endSlot?.time ?? null;

  const requestFecha = useMemo(() => {
    if (!openDateISO || !startSlot) return openDateISO;
    return addDaysISO(openDateISO, startSlot.dayOffset);
  }, [openDateISO, startSlot]);

  const fechaTexto = useMemo(() => {
    if (!openDateISO) return "";
    const d = new Date(`${openDateISO}T00:00:00`);
    return d.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [openDateISO]);

  // -- Efectos --

  useEffect(() => {
    let alive = true;
    async function loadSlots() {
      try {
        const res = await fetch(
          `/api/reservas/slots?id_club=${club.id_club}&id_cancha=${cancha.id_cancha}&dias=7`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => null);
        if (!alive) return;

        if (!res.ok) {
          setWarning(data?.error || "No se pudieron cargar los horarios");
          return;
        }

        const days = (data?.days || []) as DaySlots[];
        const seg = (data?.segmento || days?.[0]?.segmento || "publico") as Segmento;
        setSegmentoActual(seg);
        setAvailableDays(days);

        const first = days[0];
        if (first?.dateISO) {
          setOpenDateISO(first.dateISO);
          setOpenDayLabel(first.label || "Hoy");
        }
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setWarning("Error de red cargando horarios");
      }
    }
    loadSlots();
    return () => {
      alive = false;
    };
  }, [club.id_club, cancha.id_cancha]);

  function resetSelection() {
    setAnchorAbs(null);
    setSelectedAbs([]);
    setValidEndAbsSet(new Set());
  }

  const handleSelect = (absMin: number) => {
    setWarning(null);
    const s = slotsByAbs.get(absMin);

    if (!s || (s.available === false || !!s.reason)) {
      return;
    }

    if (anchorAbs === null) {
      setAnchorAbs(absMin);
      const ends = new Set<number>();
      for (const d of durationsAllowed) {
        const end = absMin + d;
        const endS = slotsByAbs.get(end);
        if (endS) ends.add(end);
      }
      setValidEndAbsSet(ends);
      setSelectedAbs([absMin]);
      return;
    }

    if (absMin === anchorAbs) {
      resetSelection();
      return;
    }

    if (!validEndAbsSet.has(absMin)) {
      setWarning(`Elegí un fin válido (+${durationsAllowed.join(" / +")})`);
      return;
    }

    const start = Math.min(anchorAbs, absMin);
    const end = Math.max(anchorAbs, absMin);
    const range = allAbsSorted.filter((m) => m >= start && m <= end);

    const hasBlockInMiddle = range.some((m) => {
      const sl = slotsByAbs.get(m);
      return sl?.available === false || !!sl?.reason;
    });

    if (hasBlockInMiddle) {
      setWarning("La selección incluye horarios no disponibles.");
      resetSelection();
      return;
    }

    setSelectedAbs(range);
    setAnchorAbs(null);
    setValidEndAbsSet(new Set());
  };

  useEffect(() => {
    let alive = true;
    async function calc() {
      setPricePreview(null);
      if (!hasValidSelection || !durationOk || !startTime || !endTime) return;

      setPriceLoading(true);
      try {
        const res = await fetch("/api/reservas/calcular-precio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_club: club.id_club,
            id_cancha: cancha.id_cancha,
            fecha: requestFecha,
            inicio: startTime,
            fin: endTime,
          }),
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!alive) return;

        if (!res.ok) {
          setPricePreview({ error: data?.error || "Error al calcular" });
          return;
        }

        setPricePreview({
          ok: true,
          precio_total: Number(data?.precio_total || 0),
          duracion_min: Number(data?.duracion_min || durationMinutes),
          id_regla: Number(data?.id_regla),
          id_tarifario: Number(data?.id_tarifario),
          segmento: data?.segmento,
        });
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setPricePreview({ error: "Error de red" });
      } finally {
        if (alive) setPriceLoading(false);
      }
    }
    calc();
    return () => {
      alive = false;
    };
  }, [hasValidSelection, durationOk, startTime, endTime, requestFecha, club.id_club, cancha.id_cancha, durationMinutes]);

  const canConfirm = useMemo(() => {
    return (
      hasValidSelection &&
      durationOk &&
      pricePreview &&
      "ok" in pricePreview &&
      pricePreview.ok &&
      pricePreview.precio_total > 0
    );
  }, [hasValidSelection, durationOk, pricePreview]);

  const etiquetaTarifa = useMemo(() => {
    const seg =
      pricePreview && "ok" in pricePreview && pricePreview.ok && pricePreview.segmento
        ? pricePreview.segmento
        : segmentoActual;
    return seg === "profe" ? "Tarifa Profe" : "Tarifa Público";
  }, [pricePreview, segmentoActual]);

  // --- RENDER ---

  const customStyle = {
    "--primary": club.color_primario || "#3b82f6",
    "--secondary": club.color_secundario || "#1e40af",
    "--text-club": club.color_texto || "#ffffff",
  } as CSSProperties;

  return (
    <section 
      style={customStyle}
      // ✅ CAMBIO: Gradiente actualizado a var(--primary)/40 en la esquina final
      className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[var(--primary)]/40 flex flex-col items-center text-white px-3 pt-24 pb-10 sm:px-6 sm:pt-36 sm:pb-12 relative selection:bg-[var(--primary)] selection:text-white"
    >
      <button
        onClick={() => router.back()}
        className="absolute top-20 left-4 sm:top-28 z-20 flex items-center justify-center p-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:bg-[var(--primary)] transition-all duration-300 group"
      >
        <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* Hero Header */}
      <div className="w-full max-w-5xl relative z-10 mb-8">
        <div className="relative w-full h-48 sm:h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <Image src={cancha.imagen} alt={cancha.nombre} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            <div className="absolute bottom-0 left-0 p-6 w-full">
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--primary)] text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-[var(--primary)]/50">
                        {club.nombre}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-sm text-[10px] font-medium border border-white/10 uppercase tracking-widest text-neutral-300">
                        {segmentoActual === "profe" ? "Profesor" : "Público"}
                    </span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-none mb-1">
                    {cancha.nombre}
                </h1>
                <p className="text-neutral-300 text-sm sm:text-base line-clamp-1 opacity-80">
                    {cancha.descripcion}
                </p>
            </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-5xl bg-[#111827]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect decorativo: ahora usa primary */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[var(--primary)] rounded-full blur-[100px] opacity-20 pointer-events-none" />

        {/* Date Selector Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 relative z-10">
          <button
            onClick={() => setShowDays((p) => !p)}
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group w-full sm:w-auto justify-between sm:justify-start"
          >
            <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[var(--primary)]" />
                <div className="flex flex-col items-start">
                    <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider">Fecha</span>
                    <span className="text-sm font-semibold capitalize text-white">{openDayLabel} <span className="opacity-50 font-normal">({fechaTexto})</span></span>
                </div>
            </div>
            <motion.span animate={{ rotate: showDays ? 180 : 0 }} className="text-neutral-400">
              ▼
            </motion.span>
          </button>
          
          <div className="flex gap-4 text-xs text-neutral-400">
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"></div>Selección</div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>Libre</div>
             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-black/40 border border-white/5 flex items-center justify-center"><Lock className="w-1.5 h-1.5 opacity-50"/></div>Ocupado</div>
          </div>
        </div>

        {/* Date Dropdown */}
        <AnimatePresence>
            {showDays && (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
            >
                <div className="flex flex-wrap gap-2 p-1">
                {availableDays.map((d) => (
                    <button
                    key={d.dateISO}
                    onClick={() => {
                        setOpenDateISO(d.dateISO);
                        setOpenDayLabel(d.label);
                        setShowDays(false);
                        resetSelection();
                        setWarning(null);
                        setPricePreview(null);
                    }}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all flex-1 sm:flex-none text-center min-w-[80px] ${
                        openDateISO === d.dateISO
                        ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300"
                    }`}
                    >
                    {d.label}
                    </button>
                ))}
                </div>
            </motion.div>
            )}
        </AnimatePresence>

        {/* Grilla de Horarios */}
        {!openDay ? (
          <div className="h-40 flex items-center justify-center text-neutral-500 animate-pulse">Cargando disponibilidad...</div>
        ) : openDay.slots.length === 0 ? (
          <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
            <p className="text-neutral-400">No hay canchas disponibles para esta fecha.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
            {openDay.slots.sort((a,b)=>a.absMin - b.absMin).map((slot) => {
                const isBlocked = slot.available === false || !!slot.reason;
                const isSelected = selectedAbs.includes(slot.absMin);
                const isValidEnd = anchorAbs !== null && validEndAbsSet.has(slot.absMin);

                if (isBlocked) {
                  return (
                     <div
                        key={`blocked-${slot.absMin}`}
                        className="py-3 rounded-lg bg-black/30 border border-white/5 flex flex-col items-center justify-center text-xs text-neutral-600 select-none opacity-50 cursor-not-allowed"
                      >
                         <div className="flex items-center gap-1 mb-0.5">
                            <Lock className="w-3 h-3"/>
                         </div>
                         <span className="line-through decoration-neutral-600 text-[10px]">{slot.time}</span>
                      </div>
                  );
                }

                // Slot Disponible
                let slotClass = "bg-[#1f2937] border-white/5 text-neutral-300 hover:bg-[#374151]";
                if (isSelected) slotClass = "bg-[var(--primary)] border-[var(--primary)] text-white shadow-[0_0_15px_var(--primary)] z-10 scale-105";
                else if (isValidEnd) slotClass = "bg-emerald-900/30 border-emerald-500/50 text-emerald-100 cursor-pointer";

                return (
                  <motion.button
                    key={`slot-${slot.absMin}`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(slot.absMin)}
                    className={`
                      relative py-3 rounded-lg border text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center gap-0.5
                      ${slotClass}
                    `}
                  >
                    <span className="font-bold tracking-tight">{slot.time}</span>
                    {isSelected && <span className="text-[9px] uppercase opacity-80 font-bold">Inicio</span>}
                  </motion.button>
                );
            })}
          </div>
        )}

        {/* Validaciones y Footer */}
        <div className="mt-8 space-y-4">
            <AnimatePresence>
                {warning && (
                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-3 rounded-xl flex items-center gap-3 text-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        {warning}
                    </motion.div>
                )}
            </AnimatePresence>
        
            {hasValidSelection && durationOk && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 sm:p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-xl">
                            <Clock className="w-6 h-6 text-[var(--primary)]" />
                        </div>
                        <div>
                            <p className="text-neutral-400 text-xs uppercase font-bold tracking-wider">Resumen</p>
                            <div className="text-white font-medium flex gap-2 items-center">
                                <span>{startTime} - {endTime}</span>
                                <span className="w-1 h-1 bg-neutral-600 rounded-full"/>
                                <span className="text-neutral-300">{durationMinutes} min</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-white/10 hidden sm:block" />

                    <div className="text-right flex flex-col items-end">
                        {priceLoading ? (
                            <span className="text-sm text-neutral-400 animate-pulse">Calculando...</span>
                        ) : pricePreview?.ok ? (
                            <>
                                <p className="text-3xl font-bold text-white tracking-tight">
                                    ${pricePreview.precio_total.toLocaleString("es-AR")}
                                </p>
                                <span className="text-xs text-[var(--primary)] font-medium bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20">
                                    {etiquetaTarifa}
                                </span>
                            </>
                        ) : (
                            <span className="text-rose-400 text-sm">Error al cotizar</span>
                        )}
                    </div>
                </motion.div>
            )}

            <button
                disabled={!canConfirm}
                onClick={async () => {
                if (!canConfirm || !startTime || !endTime) return;
                const res = await fetch("/api/reservas/draft", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                    id_club: club.id_club,
                    id_cancha: cancha.id_cancha,
                    fecha: requestFecha,
                    inicio: startTime,
                    fin: endTime,
                    }),
                    cache: "no-store",
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    alert(data?.error || "No se pudo preparar la reserva");
                    return;
                }
                router.push("/reserva/confirmacion");
                }}
                className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3
                    ${canConfirm 
                        ? "bg-[var(--primary)] hover:brightness-110 text-white shadow-[var(--primary)]/30 hover:shadow-[var(--primary)]/50 transform hover:-translate-y-1" 
                        : "bg-white/5 text-neutral-600 cursor-not-allowed border border-white/5"}
                `}
            >
                Confirmar Reserva
                {canConfirm && <CheckCircle2 className="w-5 h-5" />}
            </button>
        </div>
      </div>
    </section>
  );
}