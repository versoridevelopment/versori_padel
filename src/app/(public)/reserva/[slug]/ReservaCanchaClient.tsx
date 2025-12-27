"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

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
  absMin: number; // 0.. (puede pasar 1440 si cruza medianoche)
  time: string; // "HH:MM"
  dayOffset: 0 | 1; // 0 = fecha seleccionada, 1 = fecha+1
};

type DaySlots = {
  label: string;
  dateISO: string;
  slots: Slot[];
  durations_allowed: number[];
  segmento?: Segmento;
};

function addDaysISO(dateISO: string, add: number) {
  // Evitar toISOString() (UTC) para no correr la fecha
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + add);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function ReservaCanchaClient({
  clubId,
  clubNombre,
  cancha,
}: {
  clubId: number;
  clubNombre: string;
  cancha: CanchaUI;
}) {
  const router = useRouter();

  const [availableDays, setAvailableDays] = useState<DaySlots[]>([]);
  const [openDateISO, setOpenDateISO] = useState<string>("");
  const [openDayLabel, setOpenDayLabel] = useState<string>("Hoy");
  const [showDays, setShowDays] = useState(false);

  // Segmento resuelto por server
  const [segmentoActual, setSegmentoActual] = useState<Segmento>("publico");

  // selección
  const [anchorAbs, setAnchorAbs] = useState<number | null>(null);
  const [selectedAbs, setSelectedAbs] = useState<number[]>([]);
  const [validEndAbsSet, setValidEndAbsSet] = useState<Set<number>>(new Set());
  const [warning, setWarning] = useState<string | null>(null);

  // Preview precio
  const [priceLoading, setPriceLoading] = useState(false);
  const [pricePreview, setPricePreview] = useState<PrecioPreviewOk | PrecioPreviewErr | null>(
    null
  );

  const openDay = useMemo(() => {
    return availableDays.find((d) => d.dateISO === openDateISO) || null;
  }, [availableDays, openDateISO]);

  const durationsAllowed = useMemo(() => {
    const d = availableDays.find((x) => x.dateISO === openDateISO);
    return (d?.durations_allowed?.length ? d.durations_allowed : [60, 90, 120]) as number[];
  }, [availableDays, openDateISO]);

  const slotsByAbs = useMemo(() => {
    const map = new Map<number, Slot>();
    for (const s of openDay?.slots || []) map.set(s.absMin, s);
    return map;
  }, [openDay]);

  const allAbsSorted = useMemo(() => {
    return (openDay?.slots || []).map((s) => s.absMin).sort((a, b) => a - b);
  }, [openDay]);

  const hasValidSelection = selectedAbs.length >= 2;
  const startAbs = hasValidSelection ? selectedAbs[0] : null;
  const endAbs = hasValidSelection ? selectedAbs[selectedAbs.length - 1] : null;

  const durationMinutes =
    hasValidSelection && startAbs != null && endAbs != null ? endAbs - startAbs : 0;

  const durationOk = durationsAllowed.includes(durationMinutes);

  const startSlot = startAbs != null ? slotsByAbs.get(startAbs) : null;
  const endSlot = endAbs != null ? slotsByAbs.get(endAbs) : null;

  // Fecha efectiva para el cálculo/confirmación (si el inicio es (+1), sumamos 1 día)
  const requestFecha = useMemo(() => {
    if (!openDateISO || !startSlot) return openDateISO;
    return addDaysISO(openDateISO, startSlot.dayOffset);
  }, [openDateISO, startSlot]);

  const startTime = startSlot?.time ?? null;
  const endTime = endSlot?.time ?? null;

  const fechaTexto = useMemo(() => {
    if (!openDateISO) return "";
    const d = new Date(`${openDateISO}T00:00:00`);
    return d.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [openDateISO]);

  // cargar slots + segmento
  useEffect(() => {
    let alive = true;

    async function loadSlots() {
      try {
        // Fix recomendado: el client NO manda fecha_desde. El server decide (timezone AR).
        const res = await fetch(
          `/api/reservas/slots?id_club=${clubId}&id_cancha=${cancha.id_cancha}&dias=7`,
          { cache: "no-store" }
        );

        const data = await res.json().catch(() => null);
        if (!alive) return;

        if (!res.ok) {
          console.error("[ReservaCanchaClient] slots error:", data);
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
      } catch (e: any) {
        if (!alive) return;
        setWarning(e?.message || "Error de red cargando horarios");
      }
    }

    loadSlots();
    return () => {
      alive = false;
    };
  }, [clubId, cancha.id_cancha]);

  function resetSelection() {
    setAnchorAbs(null);
    setSelectedAbs([]);
    setValidEndAbsSet(new Set());
  }

  // “fin” sólo en incrementos válidos
  const handleSelect = (absMin: number) => {
    setWarning(null);

    if (anchorAbs === null) {
      setAnchorAbs(absMin);

      const ends = new Set<number>();
      for (const d of durationsAllowed) {
        const end = absMin + d;
        if (slotsByAbs.has(end)) ends.add(end);
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
      setWarning(`Elegí un fin válido (+${durationsAllowed.join(" / +")}) desde el inicio.`);
      return;
    }

    const start = Math.min(anchorAbs, absMin);
    const end = Math.max(anchorAbs, absMin);

    const range = allAbsSorted.filter((m) => m >= start && m <= end);

    setSelectedAbs(range);
    setAnchorAbs(null);
    setValidEndAbsSet(new Set());
  };

  // calcular precio (server decide segmento)
  useEffect(() => {
    let alive = true;

    async function calc() {
      setPricePreview(null);

      if (!hasValidSelection || !durationOk || !startTime || !endTime || !openDateISO) return;

      setPriceLoading(true);

      try {
        const res = await fetch("/api/reservas/calcular-precio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_club: clubId,
            id_cancha: cancha.id_cancha,
            fecha: requestFecha,
            inicio: startTime,
            fin: endTime,
            // NO mandamos segmento
          }),
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        if (!alive) return;

        if (!res.ok) {
          setPricePreview({ error: data?.error || "No se pudo calcular el precio" });
          return;
        }

        setPricePreview({
          ok: true,
          precio_total: Number(data?.precio_total || 0),
          duracion_min: Number(data?.duracion_min || durationMinutes),
          id_regla: Number(data?.id_regla),
          id_tarifario: Number(data?.id_tarifario),
          segmento: (data?.segmento as Segmento) || undefined,
        });
      } catch (e: any) {
        if (!alive) return;
        setPricePreview({ error: e?.message || "Error de red calculando el precio" });
      } finally {
        if (alive) setPriceLoading(false);
      }
    }

    calc();
    return () => {
      alive = false;
    };
  }, [
    clubId,
    cancha.id_cancha,
    openDateISO,
    hasValidSelection,
    durationOk,
    startTime,
    endTime,
    durationMinutes,
    requestFecha,
  ]);

  const canConfirm = useMemo(() => {
    return (
      hasValidSelection &&
      durationOk &&
      !!pricePreview &&
      "ok" in (pricePreview as any) &&
      (pricePreview as any).ok === true &&
      (pricePreview as PrecioPreviewOk).precio_total > 0
    );
  }, [hasValidSelection, durationOk, pricePreview]);

  const etiquetaTarifa = useMemo(() => {
    const seg =
      pricePreview &&
      "ok" in pricePreview &&
      (pricePreview as any).ok &&
      (pricePreview as any).segmento
        ? ((pricePreview as any).segmento as Segmento)
        : segmentoActual;

    return seg === "profe" ? "Tarifa Profe" : "Tarifa Público";
  }, [pricePreview, segmentoActual]);

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#001a33] to-[#002b5b] flex flex-col items-center text-white px-6 py-20 relative">
      <button
        onClick={() => router.back()}
        className="absolute top-24 left-8 bg-transparent border border-blue-400 text-blue-300 font-semibold px-4 py-2 rounded-xl hover:bg-blue-700/20 hover:text-white transition-all duration-200"
      >
        ←
      </button>

      <div className="relative w-full max-w-5xl h-80 rounded-3xl overflow-hidden shadow-xl border border-[#1b4e89]">
        <Image src={cancha.imagen} alt={cancha.nombre} fill className="object-cover" priority />
      </div>

      <div className="text-center mt-10">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-200 mb-2">{clubNombre}</p>
        <h1 className="text-5xl font-extrabold mb-4">{cancha.nombre}</h1>
        <p className="text-blue-300 text-lg mb-3">{cancha.descripcion}</p>

        <p className="text-xs text-blue-200/70">
          Segmento actual:{" "}
          <span className="font-semibold">{segmentoActual === "profe" ? "Profe" : "Público"}</span>
        </p>
      </div>

      <div className="w-full max-w-5xl bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-8 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowDays((p) => !p)}
            className="flex items-center gap-3 text-xl font-semibold text-blue-300 hover:text-white transition-all"
          >
            <Calendar className="w-6 h-6 text-blue-300" />
            {openDayLabel}
            {openDayLabel === "Hoy" && (
              <span className="text-neutral-400 text-sm ml-2">({fechaTexto})</span>
            )}
            <motion.span animate={{ rotate: showDays ? 180 : 0 }} transition={{ duration: 0.2 }}>
              ▼
            </motion.span>
          </button>

          <p className="text-neutral-400 text-sm">Los turnos se pueden solicitar hasta una semana antes.</p>
        </div>

        {showDays && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-6"
          >
            <div className="flex flex-wrap gap-3">
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
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                    openDateISO === d.dateISO
                      ? "bg-blue-600 border-blue-400 text-white"
                      : "bg-[#102b55] border-[#1b4e89] hover:bg-blue-900"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {!openDay ? (
          <div className="text-neutral-400 text-sm">Cargando horarios…</div>
        ) : openDay.slots.length === 0 ? (
          <div className="text-rose-300 text-sm">No hay reglas activas para este día (o no hay tarifario asignado).</div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {openDay.slots.map((slot) => {
                const isSelected = selectedAbs.includes(slot.absMin);
                const isAnchor = anchorAbs === slot.absMin;
                const isValidEnd = anchorAbs !== null && validEndAbsSet.has(slot.absMin);

                const base =
                  "cursor-pointer py-3 rounded-xl text-center font-semibold transition-all duration-200 border relative overflow-hidden";

                const cls = isSelected
                  ? "bg-blue-600 border-blue-400 text-white animate-pulse-glow"
                  : isValidEnd
                  ? "bg-lime-500/15 hover:bg-lime-500/25 border-lime-400/50 text-lime-100"
                  : "bg-emerald-600/20 hover:bg-emerald-600/35 border-emerald-500/30 text-emerald-100";

                return (
                  <motion.div
                    key={`${slot.dayOffset}-${slot.absMin}`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(slot.absMin)}
                    className={`${base} ${cls} ${isAnchor ? "ring-2 ring-blue-300/60" : ""}`}
                    title={slot.dayOffset === 1 ? "Horario del día siguiente (+1)" : ""}
                  >
                    {isSelected && (
                      <motion.span
                        className="absolute inset-0 rounded-xl bg-blue-400/30 blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.8, 0] }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" /> {slot.time}
                      {slot.dayOffset === 1 && (
                        <span className="ml-1 text-[10px] text-blue-100/80">( +1 )</span>
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {warning && (
          <div className="flex items-center gap-2 text-yellow-400 mt-4">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm">{warning}</p>
          </div>
        )}

        {!hasValidSelection && (
          <p className="text-neutral-500 text-sm italic mt-4">
            Elegí un inicio y luego un fin válido (+{durationsAllowed.join(" / +")})
          </p>
        )}

        {hasValidSelection && !durationOk && (
          <p className="text-yellow-400 text-sm mt-4">
            La duración seleccionada debe ser {durationsAllowed.join(" / ")} min.
          </p>
        )}

        {hasValidSelection && durationOk && (
          <div className="mt-4">
            {priceLoading ? (
              <p className="text-neutral-400 text-sm">Calculando precio…</p>
            ) : pricePreview && "error" in pricePreview ? (
              <p className="text-rose-300 text-sm">{pricePreview.error}</p>
            ) : pricePreview && "ok" in pricePreview && (pricePreview as any).ok ? (
              <p className="text-neutral-300 text-sm">
                Total:{" "}
                <span className="text-blue-300 font-semibold">
                  ${(pricePreview as PrecioPreviewOk).precio_total.toLocaleString("es-AR")}
                </span>{" "}
                <span className="text-neutral-500 text-xs ml-1">({durationMinutes} min)</span>
                <span className="text-neutral-500 text-xs ml-2">· {etiquetaTarifa}</span>
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-neutral-300">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-sm bg-emerald-600/35 border border-emerald-500/30" />
              Disponible
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-sm bg-blue-600 border border-blue-400" />
              Seleccionado
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-sm bg-lime-500/15 border border-lime-400/50" />
              Fin válido
            </div>
          </div>

          <button
            disabled={!canConfirm}
            onClick={async () => {
              if (!canConfirm || !startTime || !endTime) return;

              const res = await fetch("/api/reservas/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id_club: clubId,
                  id_cancha: cancha.id_cancha,
                  fecha: requestFecha,
                  inicio: startTime,
                  fin: endTime,
                  // NO mandamos segmento
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
            className={`flex items-center gap-2 font-semibold px-6 py-3 rounded-xl shadow-md transition-all ${
              canConfirm
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-600 cursor-not-allowed text-gray-300"
            }`}
          >
            Confirmar Turno
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
