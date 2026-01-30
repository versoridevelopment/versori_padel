"use client";

import { useEffect, useMemo, useState } from "react";
import type { Club } from "@/lib/ObetenerClubUtils/getClubBySubdomain";
import type { SlotPoint } from "./SingleCourtAgenda";

type Segmento = "publico" | "profe";

export type CanchaUI = {
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

export type DaySlots = {
  label: string;
  dateISO: string;
  slots: SlotPoint[];
  durations_allowed: number[];
  segmento?: Segmento;
};

const CELL_MIN = 30;

function addDaysISO(dateISO: string, add: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + add);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// ===== Regla anti “30 colgados” (bloques libres máximos en unidades de 30m) =====
type FreeBlockU = { startU: number; endU: number }; // [startU, endU)

function absToU(absMin: number) {
  return Math.round(absMin / CELL_MIN); // CELL_MIN = 30
}

function buildFreeBlocksFromSlots(
  allAbsSorted: number[],
  isCellFreeFn: (abs: number) => boolean
): FreeBlockU[] {
  const free: FreeBlockU[] = [];
  if (!allAbsSorted.length) return free;

  let runStartAbs: number | null = null;
  let prevAbs: number | null = null;

  for (const abs of allAbsSorted) {
    const freeCell = isCellFreeFn(abs);

    if (freeCell) {
      if (runStartAbs === null) runStartAbs = abs;
      prevAbs = abs;
      continue;
    }

    // cerramos racha si veníamos en free
    if (runStartAbs !== null && prevAbs !== null) {
      const startU = absToU(runStartAbs);
      const endU = absToU(prevAbs + CELL_MIN); // boundary después de la última celda libre
      if (endU > startU) free.push({ startU, endU });
    }
    runStartAbs = null;
    prevAbs = null;
  }

  // cerrar racha final
  if (runStartAbs !== null && prevAbs !== null) {
    const startU = absToU(runStartAbs);
    const endU = absToU(prevAbs + CELL_MIN);
    if (endU > startU) free.push({ startU, endU });
  }

  return free;
}

/**
 * ✅ regla:
 * bloquear SOLO si deja exactamente 1 unidad (30m) libre
 * al inicio o al final del bloque libre máximo donde cae.
 */
function noDangling30(block: FreeBlockU, startU: number, endU: number) {
  const leftU = startU - block.startU;
  const rightU = block.endU - endU;

  if (leftU === 1) return false;
  if (rightU === 1) return false;
  return true;
}

export function useReservaCanchaLogic({
  club,
  cancha,
}: {
  club: Club;
  cancha: CanchaUI;
}) {
  // data
  const [availableDays, setAvailableDays] = useState<DaySlots[]>([]);
  const [openDateISO, setOpenDateISO] = useState<string>("");
  const [openDayLabel, setOpenDayLabel] = useState<string>("Hoy");
  const [showDays, setShowDays] = useState(false);
  const [segmentoActual, setSegmentoActual] = useState<Segmento>("publico");

  // selección por CELDAS (cada celda = 30m)
  const [anchorAbs, setAnchorAbs] = useState<number | null>(null);
  const [selectedAbs, setSelectedAbs] = useState<number[]>([]);
  const [validEndAbsSet, setValidEndAbsSet] = useState<Set<number>>(new Set());
  const [warning, setWarning] = useState<string | null>(null);

  // precio
  const [priceLoading, setPriceLoading] = useState(false);
  const [pricePreview, setPricePreview] = useState<
    PrecioPreviewOk | PrecioPreviewErr | null
  >(null);

  const openDay = useMemo(() => {
    return availableDays.find((d) => d.dateISO === openDateISO) || null;
  }, [availableDays, openDateISO]);

  const durationsAllowed = useMemo(() => {
    return (openDay?.durations_allowed?.length ? openDay.durations_allowed : [
      60,
      90,
      120,
    ]) as number[];
  }, [openDay]);

  const slotsByAbs = useMemo(() => {
    const map = new Map<number, SlotPoint>();
    for (const s of openDay?.slots || []) map.set(s.absMin, s);
    return map;
  }, [openDay]);

  const allAbsSorted = useMemo(() => {
    return (openDay?.slots || []).map((s) => s.absMin).sort((a, b) => a - b);
  }, [openDay]);

  // ✅ celda libre = slot existe + canStart true + sin reason
  const isCellFree = (abs: number) => {
    const sl = slotsByAbs.get(abs);
    return !!sl && sl.canStart === true && !sl.reason;
  };

  const timeAt = (abs: number) => slotsByAbs.get(abs)?.time ?? null;

  const resetSelection = () => {
    setAnchorAbs(null);
    setSelectedAbs([]);
    setValidEndAbsSet(new Set());
  };

  // --- Computados selección por celdas ---
  const hasAnySelection = selectedAbs.length >= 1;
  const startCellAbs = hasAnySelection ? selectedAbs[0] : null;
  const lastCellAbs = hasAnySelection ? selectedAbs[selectedAbs.length - 1] : null;

  const endBoundaryAbs =
    startCellAbs != null && lastCellAbs != null ? lastCellAbs + CELL_MIN : null;

  const durationMinutes =
    startCellAbs != null && endBoundaryAbs != null ? endBoundaryAbs - startCellAbs : 0;

  const durationOk = durationsAllowed.includes(durationMinutes);

  const startTime = startCellAbs != null ? timeAt(startCellAbs) : null;
  const endTime = endBoundaryAbs != null ? timeAt(endBoundaryAbs) : null;

  const startSlot = startCellAbs != null ? slotsByAbs.get(startCellAbs) : null;

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

  // --- Load slots ---
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

  // --- Selector por celdas (30m) ---
  const handleSelect = (absMin: number) => {
    setWarning(null);

    // solo click en celdas libres
    if (!isCellFree(absMin)) return;

    // primer click -> anchor
    if (anchorAbs === null) {
      setAnchorAbs(absMin);

      // ✅ bloques libres máximos (con celdas realmente "clickables")
      const freeBlocks = buildFreeBlocksFromSlots(allAbsSorted, isCellFree);

      // valid ends = última CELDA a tocar
      const ends = new Set<number>();

      for (const d of durationsAllowed) {
        const cellsNeeded = d / CELL_MIN; // 60->2, 90->3, 120->4
        if (!Number.isFinite(cellsNeeded) || cellsNeeded < 1) continue;

        const last = absMin + (cellsNeeded - 1) * CELL_MIN;
        const boundary = last + CELL_MIN;

        // 1) deben existir y ser libres todas las celdas del rango
        const okRange = allAbsSorted
          .filter((m) => m >= absMin && m <= last)
          .every((m) => isCellFree(m));

        // 2) boundary debe existir para poder tomar endTime
        const boundaryExists = !!slotsByAbs.get(boundary);

        if (!okRange || !boundaryExists) continue;

        // ✅ 3) regla anti “30 colgados”
        const startU = absToU(absMin);
        const endU = absToU(boundary);

        const block = freeBlocks.find((b) => startU >= b.startU && endU <= b.endU);
        if (!block) continue;

        if (!noDangling30(block, startU, endU)) continue;

        ends.add(last);
      }

      setValidEndAbsSet(ends);
      setSelectedAbs([absMin]);
      return;
    }

    // segundo click: elegir última celda
    if (absMin === anchorAbs) {
      resetSelection();
      return;
    }

    if (!validEndAbsSet.has(absMin)) {
      setWarning(`Elegí un fin válido (+${durationsAllowed.join(" / +")})`);
      return;
    }

    const start = Math.min(anchorAbs, absMin);
    const endLastCell = Math.max(anchorAbs, absMin);

    // construir rango de celdas [start..endLastCell] cada 30m
    const range: number[] = [];
    for (let m = start; m <= endLastCell; m += CELL_MIN) range.push(m);

    // validar que no haya bloqueos en el medio
    const hasBlock = range.some((m) => !isCellFree(m));
    if (hasBlock) {
      setWarning("La selección incluye horarios no disponibles.");
      resetSelection();
      return;
    }

    setSelectedAbs(range);
    setAnchorAbs(null);
    setValidEndAbsSet(new Set());
  };

  // --- Calcular precio ---
  useEffect(() => {
    let alive = true;
    async function calc() {
      setPricePreview(null);

      // para cotizar: necesitamos duración válida y start/end time
      if (!hasAnySelection || !durationOk || !startTime || !endTime) return;

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
  }, [
    hasAnySelection,
    durationOk,
    startTime,
    endTime,
    requestFecha,
    club.id_club,
    cancha.id_cancha,
    durationMinutes,
  ]);

  const canConfirm = useMemo(() => {
    return (
      hasAnySelection &&
      durationOk &&
      pricePreview &&
      "ok" in pricePreview &&
      pricePreview.ok &&
      pricePreview.precio_total > 0
    );
  }, [hasAnySelection, durationOk, pricePreview]);

  const etiquetaTarifa = useMemo(() => {
    const seg =
      pricePreview && "ok" in pricePreview && pricePreview.ok && pricePreview.segmento
        ? pricePreview.segmento
        : segmentoActual;
    return seg === "profe" ? "Tarifa Profe" : "Tarifa Público";
  }, [pricePreview, segmentoActual]);

  const selectDay = (d: DaySlots) => {
    setOpenDateISO(d.dateISO);
    setOpenDayLabel(d.label);
    setShowDays(false);
    resetSelection();
    setWarning(null);
    setPricePreview(null);
  };

  return {
    // data/day
    availableDays,
    openDateISO,
    openDayLabel,
    openDay,
    showDays,
    setShowDays,
    segmentoActual,
    durationsAllowed,
    fechaTexto,

    // selection
    anchorAbs,
    selectedAbs,
    validEndAbsSet,
    warning,
    setWarning,
    handleSelect,
    resetSelection,

    // computed selection summary
    hasAnySelection,
    durationMinutes,
    durationOk,
    startTime,
    endTime,
    requestFecha,

    // pricing
    priceLoading,
    pricePreview,
    etiquetaTarifa,

    // confirm
    canConfirm,

    // actions
    selectDay,
  };
}
