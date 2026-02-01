"use client";

import { useEffect, useMemo, useState } from "react";
import type { CanchaUI, ReservaUI } from "../types";

export type TipoTurno =
  | "normal"
  | "profesor"
  | "torneo"
  | "escuela"
  | "cumpleanos"
  | "abonado";

export type ReservaSidebarProps = {
  isOpen: boolean;
  onClose: () => void;

  // Esquema on-demand
  reservaId?: number | null;
  initialData?: Partial<ReservaUI>;

  isCreating: boolean;
  selectedDate: Date;

  // ✅ Prop opcional para recibir la fecha exacta (ej: "2024-01-02")
  // útil cuando clicas un turno de madrugada que corresponde al día siguiente
  fecha?: string;

  preSelectedCanchaId?: number | null;
  preSelectedTime?: string | null;

  idClub: number;
  canchas: CanchaUI[];
  reservas?: ReservaUI[];

  startHour?: number;
  endHour?: number;

  onCreated: () => void;
};

type Segmento = "publico" | "profe";

// ===== Helpers exportables =====
export const formatMoney = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(val || 0));

// ✅ Helper blindado para fechas
function toISODateLocal(d: Date | string | undefined | null) {
  if (!d) return new Date().toISOString().split("T")[0];

  const dateObj =
    typeof d === "string" ? new Date(d.includes("T") ? d : d + "T12:00:00") : d;

  if (isNaN(dateObj.getTime())) return new Date().toISOString().split("T")[0];

  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function hhmmToDecimal(hhmm: string, startHour: number) {
  const [h, m] = (hhmm || "").slice(0, 5).split(":").map(Number);
  let dec = (h || 0) + (m || 0) / 60;
  if (dec < startHour) dec += 24;
  return dec;
}

function addMinutesHHMM(hhmm: string, addMin: number) {
  const [h, m] = (hhmm || "").slice(0, 5).split(":").map(Number);
  let total = (h || 0) * 60 + (m || 0) + (addMin || 0);
  total = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function diffMinutesHHMM(startHHMM: string, endHHMM: string) {
  const [sh, sm] = startHHMM.slice(0, 5).split(":").map(Number);
  const [eh, em] = endHHMM.slice(0, 5).split(":").map(Number);
  const s = (sh || 0) * 60 + (sm || 0);
  let e = (eh || 0) * 60 + (em || 0);
  if (e <= s) e += 1440; // cruza medianoche
  return e - s;
}

/** ===== Regla anti “30 colgados” ===== */
type IntervalU = { startU: number; endU: number };
type FreeBlockU = { startU: number; endU: number };

function toUnits30(hours: number) {
  return Math.round(hours * 2);
}

function unitsToHHMM(u: number) {
  const mins = u * 30;
  const total = ((mins % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function buildFreeBlocks(
  dayStartU: number,
  dayEndU: number,
  occupiedU: IntervalU[],
): FreeBlockU[] {
  if (dayEndU <= dayStartU) return [];

  const occ = occupiedU
    .map((x) => ({
      startU: Math.max(dayStartU, x.startU),
      endU: Math.min(dayEndU, x.endU),
    }))
    .filter((x) => x.endU > x.startU)
    .sort((a, b) => a.startU - b.startU);

  const merged: IntervalU[] = [];
  for (const it of occ) {
    const last = merged[merged.length - 1];
    if (!last || it.startU > last.endU) merged.push({ ...it });
    else last.endU = Math.max(last.endU, it.endU);
  }

  const free: FreeBlockU[] = [];
  let cursor = dayStartU;

  for (const it of merged) {
    if (it.startU > cursor) free.push({ startU: cursor, endU: it.startU });
    cursor = Math.max(cursor, it.endU);
  }
  if (cursor < dayEndU) free.push({ startU: cursor, endU: dayEndU });

  return free;
}

function noDangling30(block: FreeBlockU, startU: number, endU: number) {
  const leftU = startU - block.startU;
  const rightU = block.endU - endU;
  if (leftU === 1) return false;
  if (rightU === 1) return false;
  return true;
}

export function useReservaSidebar(props: ReservaSidebarProps) {
  const {
    isOpen,
    onClose,
    isCreating,
    selectedDate,
    fecha,
    preSelectedCanchaId,
    preSelectedTime,
    idClub,
    canchas,
    reservas = [],
    startHour = 8,
    endHour = 26,
    onCreated,
    reservaId,
    initialData,
  } = props;

  const fechaISO = useMemo(
    () => toISODateLocal(fecha || selectedDate),
    [fecha, selectedDate],
  );

  // Reserva “full”
  const [reservaFull, setReservaFull] = useState<ReservaUI | null>(null);

  useEffect(() => {
    if (!isOpen || isCreating) return;
    if (initialData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setReservaFull((prev) =>
        prev?.id_reserva === initialData.id_reserva
          ? prev
          : (initialData as any),
      );
    } else {
      setReservaFull(null);
    }
  }, [isOpen, isCreating, initialData]);

  // Fetch full por id (Solo en modo ver/editar)
  useEffect(() => {
    let alive = true;
    async function loadFull() {
      if (!isOpen || isCreating || !reservaId) return;
      try {
        const res = await fetch(`/api/admin/reservas/${reservaId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        if (!alive) return;
        const full = (json?.data ?? json) as ReservaUI | null;
        if (full) setReservaFull(full);
      } catch (err) {
        console.error(err);
      }
    }
    loadFull();
    return () => {
      alive = false;
    };
  }, [isOpen, isCreating, reservaId]);

  // =========================================================
  // Estados Formulario
  // =========================================================
  const [showCobro, setShowCobro] = useState(false);
  const [cobroMonto, setCobroMonto] = useState<number>(0);
  const [cobroMetodo, setCobroMetodo] = useState<string>("efectivo");
  const [cobroNota, setCobroNota] = useState<string>("Pagó en caja");
  const [cobroLoading, setCobroLoading] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    nombre: string;
    telefono: string;
    email: string;
    esTurnoFijo: boolean;
    tipoTurno: TipoTurno;

    // auto
    duracion: number;
    horaInicio: string;

    // manual
    precioManual: boolean;
    horaInicioManual: string; // "desde"
    horaFinManual: string; // "hasta"

    precio: number;
    notas: string;
    canchaId: string;
    weeksAhead: number;
    endDate: string;
  }>({
    nombre: "",
    telefono: "",
    email: "",
    esTurnoFijo: false,
    tipoTurno: "normal",

    duracion: 90,
    horaInicio: "",

    precioManual: false,
    horaInicioManual: "",
    horaFinManual: "",

    precio: 0,
    notas: "",
    canchaId: "",
    weeksAhead: 8,
    endDate: "",
  });

  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 1) Occupied intervals
  const occupiedIntervals = useMemo(() => {
    if (!isCreating) return [];
    const id_cancha = Number(formData.canchaId);
    if (!id_cancha) return [];

    return reservas
      .filter((r) => Number(r.id_cancha) === id_cancha)
      .map((r) => {
        const s = hhmmToDecimal(r.horaInicio, startHour);
        let e = hhmmToDecimal(r.horaFin, startHour);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const offset = Number((r as any).fin_dia_offset || 0);
        if (offset === 1 || e <= s) e += 24;
        return { start: s, end: e, id: r.id_reserva };
      });
  }, [isCreating, reservas, formData.canchaId, startHour]);

  const dayStartU = useMemo(() => toUnits30(startHour), [startHour]);
  const dayEndU = useMemo(() => toUnits30(endHour), [endHour]);

  const occupiedU: IntervalU[] = useMemo(
    () =>
      occupiedIntervals.map((o) => ({
        startU: toUnits30(o.start),
        endU: toUnits30(o.end),
      })),
    [occupiedIntervals],
  );

  const freeBlocks = useMemo(
    () => buildFreeBlocks(dayStartU, dayEndU, occupiedU),
    [dayStartU, dayEndU, occupiedU],
  );

  // 2) Available times (AUTO: depende de duracion)
  const availableTimes = useMemo(() => {
    if (!isOpen || !isCreating) return [];
    if (formData.precioManual) return []; // en manual no usamos este select

    const durMin = Number(formData.duracion);
    if (!Number.isFinite(durMin) || durMin <= 0) return [];
    if (durMin % 30 !== 0) return [];

    const durU = Math.round(durMin / 30);

    const out: {
      value: string;
      label: string;
      decimal: number;
      finLabel: string;
    }[] = [];

    for (let startU = dayStartU; startU + durU <= dayEndU; startU += 1) {
      const endU = startU + durU;
      const block = freeBlocks.find(
        (b) => startU >= b.startU && endU <= b.endU,
      );
      if (!block) continue;
      if (!noDangling30(block, startU, endU)) continue;

      const inicioHHMM = unitsToHHMM(startU);
      const finHHMM = unitsToHHMM(endU);

      out.push({
        value: inicioHHMM,
        label: inicioHHMM,
        decimal: startU / 2,
        finLabel: finHHMM,
      });
    }
    return out;
  }, [isOpen, isCreating, formData.duracion, formData.precioManual, freeBlocks, dayStartU, dayEndU]);

  // 2B) Available times (MANUAL: "desde" y "hasta")
  const manualDesdeOptions = useMemo(() => {
    if (!isOpen || !isCreating) return [];
    if (!formData.precioManual) return [];

    const out: { value: string; label: string }[] = [];

    // "desde" válido si existe AL MENOS un "hasta" posible dentro del mismo bloque
    for (const b of freeBlocks) {
      for (let startU = b.startU; startU + 1 <= b.endU; startU += 1) {
        // ¿hay algún endU que sirva?
        let ok = false;
        for (let endU = startU + 1; endU <= b.endU; endU += 1) {
          if (noDangling30(b, startU, endU)) {
            ok = true;
            break;
          }
        }
        if (!ok) continue;
        const hhmm = unitsToHHMM(startU);
        out.push({ value: hhmm, label: hhmm });
      }
    }
    // dedupe (por wrap de medianoche)
    const seen = new Set<string>();
    return out.filter((x) => (seen.has(x.value) ? false : (seen.add(x.value), true)));
  }, [isOpen, isCreating, formData.precioManual, freeBlocks]);

  const manualHastaOptions = useMemo(() => {
    if (!isOpen || !isCreating) return [];
    if (!formData.precioManual) return [];
    const desde = String(formData.horaInicioManual || "");
    if (!/^\d{2}:\d{2}$/.test(desde)) return [];

    const startDec = hhmmToDecimal(desde, startHour);
    const startU = toUnits30(startDec);

    const block = freeBlocks.find((b) => startU >= b.startU && startU < b.endU);
    if (!block) return [];

    const out: { value: string; label: string }[] = [];
    for (let endU = startU + 1; endU <= block.endU; endU += 1) {
      if (!noDangling30(block, startU, endU)) continue;
      const hhmm = unitsToHHMM(endU);
      out.push({ value: hhmm, label: hhmm });
    }

    const seen = new Set<string>();
    return out.filter((x) => (seen.has(x.value) ? false : (seen.add(x.value), true)));
  }, [
    isOpen,
    isCreating,
    formData.precioManual,
    formData.horaInicioManual,
    freeBlocks,
    startHour,
  ]);

  // ✅ duración calculada en manual (desde/hasta)
  const duracionManualCalculada = useMemo(() => {
    if (!formData.precioManual) return 0;
    const desde = String(formData.horaInicioManual || "");
    const hasta = String(formData.horaFinManual || "");
    if (!/^\d{2}:\d{2}$/.test(desde) || !/^\d{2}:\d{2}$/.test(hasta)) return 0;

    const mins = diffMinutesHHMM(desde, hasta);
    if (!Number.isFinite(mins) || mins <= 0) return 0;
    if (mins % 30 !== 0) return 0;
    return mins;
  }, [formData.precioManual, formData.horaInicioManual, formData.horaFinManual]);

  // ✅ sincronizar "duracion" interna cuando es manual (para que el resto del UI pueda mostrarlo)
  useEffect(() => {
    if (!isOpen || !isCreating) return;
    if (!formData.precioManual) return;
    if (!duracionManualCalculada) return;

    setFormData((p) => (p.duracion === duracionManualCalculada ? p : { ...p, duracion: duracionManualCalculada }));
  }, [isOpen, isCreating, formData.precioManual, duracionManualCalculada]);

  // ✅ 3) Sincronización al abrir: cancha + hora (AUTO) y defaults (MANUAL)
  useEffect(() => {
    if (!isOpen || !isCreating) return;

    const defaultCancha =
      preSelectedCanchaId?.toString() ||
      (canchas[0]?.id_cancha?.toString() ?? "");

    let defaultHoraAuto = preSelectedTime || "";
    if (!defaultHoraAuto && availableTimes.length > 0) {
      defaultHoraAuto = availableTimes[0].value;
    }

    setFormData((prev) => {
      const canchaChanged = prev.canchaId !== defaultCancha;

      // AUTO
      const horaAutoChanged = defaultHoraAuto && prev.horaInicio !== defaultHoraAuto;

      // MANUAL defaults: si no están seteados, copiamos desde el auto
      const needsManualDefaults =
        prev.precioManual &&
        (!prev.horaInicioManual || !prev.horaFinManual) &&
        (defaultHoraAuto || prev.horaInicio);

      if (!canchaChanged && !horaAutoChanged && !needsManualDefaults) return prev;

      const baseHora = defaultHoraAuto || prev.horaInicio;

      return {
        ...prev,
        canchaId: defaultCancha,
        horaInicio: horaAutoChanged ? defaultHoraAuto : prev.horaInicio,
        // si es manual y no tiene valores, los inicializamos
        ...(needsManualDefaults
          ? {
              horaInicioManual: baseHora,
              horaFinManual: addMinutesHHMM(baseHora, Number(prev.duracion || 90)),
            }
          : {}),
        precio: 0,
      };
    });

    setPriceError(null);
    setCreateError(null);
  }, [
    isOpen,
    isCreating,
    preSelectedCanchaId,
    preSelectedTime,
    canchas,
    availableTimes,
  ]);

  // ESC Key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Helpers Visuales
  const canchaDisplay = useMemo(() => {
    const cid = isCreating ? Number(formData.canchaId) : reservaFull?.id_cancha;
    return canchas.find((x) => x.id_cancha === cid)?.nombre || "Cancha";
  }, [isCreating, canchas, formData.canchaId, reservaFull]);

  const fechaDisplay = useMemo(() => {
    return new Date(fechaISO + "T12:00:00").toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  }, [fechaISO]);

  const horaFinCalculada = useMemo(() => {
    if (formData.precioManual) {
      return formData.horaFinManual || "";
    }
    if (!formData.horaInicio) return "";
    return addMinutesHHMM(formData.horaInicio, Number(formData.duracion || 0));
  }, [
    formData.precioManual,
    formData.horaInicio,
    formData.horaFinManual,
    formData.duracion,
  ]);

  // =========================================================
  // Precio Automático (solo si NO es manual)
  // =========================================================
  useEffect(() => {
    let alive = true;

    async function calc() {
      if (!isOpen || !isCreating) return;
      if (formData.precioManual) return; // ✅ manual => NO calculamos por tarifario

      const id_cancha = Number(formData.canchaId);
      const inicio = formData.horaInicio;
      const dur = Number(formData.duracion);

      if (!id_cancha || !inicio) return;
      if (!Number.isFinite(dur) || dur <= 0 || dur % 30 !== 0) return;

      const fin = addMinutesHHMM(inicio, dur);

      setPriceLoading(true);
      setPriceError(null);

      try {
        const res = await fetch("/api/reservas/calcular-precio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_club: idClub,
            id_cancha,
            fecha: fechaISO,
            inicio,
            fin,
          }),
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);
        if (!alive) return;

        if (!res.ok || !json?.ok) {
          console.warn("Precio calc warn:", json?.error);
          setFormData((p) => ({ ...p, precio: 0 }));
        } else {
          setFormData((p) => ({
            ...p,
            precio: Number(json.precio_total || 0),
          }));
        }
      } catch (e: any) {
        if (alive) setPriceError("Error calc precio");
      } finally {
        if (alive) setPriceLoading(false);
      }
    }

    const t = setTimeout(calc, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [
    isOpen,
    isCreating,
    idClub,
    fechaISO,
    formData.canchaId,
    formData.horaInicio,
    formData.duracion,
    formData.precioManual,
  ]);

  // =========================================================
  // Acciones
  // =========================================================
  const getWhatsappLink = (phone: string) =>
    `https://wa.me/${String(phone || "").replace(/\D/g, "")}`;

  async function handleCreate() {
    setCreateError(null);

    const id_cancha = Number(formData.canchaId);
    const precioManual = !!formData.precioManual;

    // inicio/fin según modo
    const inicio = precioManual ? formData.horaInicioManual : formData.horaInicio;

    let fin = "";
    let dur = 0;

    if (precioManual) {
      if (!inicio) return setCreateError("Falta horario desde");
      if (!formData.horaFinManual) return setCreateError("Falta horario hasta");

      fin = formData.horaFinManual;
      dur = diffMinutesHHMM(inicio, fin);

      if (!Number.isFinite(dur) || dur <= 0 || dur % 30 !== 0) {
        return setCreateError("Rango horario inválido (múltiplos de 30)");
      }

      if (!Number.isFinite(Number(formData.precio)) || Number(formData.precio) <= 0) {
        return setCreateError("Precio manual inválido");
      }
    } else {
      if (!inicio) return setCreateError("Falta horario");
      dur = Number(formData.duracion);
      if (!Number.isFinite(dur) || dur <= 0 || dur % 30 !== 0) {
        return setCreateError("Duración inválida (múltiplos de 30)");
      }
      fin = addMinutesHHMM(inicio, dur);
    }

    if (!formData.nombre.trim()) return setCreateError("Nombre requerido");
    if (!id_cancha) return setCreateError("Falta cancha");

    setCreateLoading(true);

    try {
      const url = formData.esTurnoFijo
        ? "/api/admin/turnos-fijos"
        : "/api/admin/reservas";

      const payload: any = {
        id_club: idClub,
        id_cancha,
        fecha: fechaISO,
        inicio,
        fin,

        // ✅ mandamos igual duracion_min para consistencia (y el backend igual puede usar fin)
        duracion_min: dur,

        tipo_turno: formData.tipoTurno,
        cliente_nombre: formData.nombre.trim(),
        cliente_telefono: formData.telefono.trim(),
        cliente_email: formData.email.trim() || null,
        notas: formData.notas.trim() || null,

        // ✅ manual override
        precio_manual: precioManual,
        precio_total_manual: precioManual ? Number(formData.precio || 0) : null,
      };

      if (formData.esTurnoFijo) {
        payload.weeks_ahead = Number(formData.weeksAhead || 8);
        payload.start_date = fechaISO;
        payload.dow = new Date(fechaISO + "T12:00:00").getDay();
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error creando");

      if (onCreated) onCreated();
      onClose();

      setFormData((prev) => ({
        ...prev,
        nombre: "",
        telefono: "",
        email: "",
        notas: "",
      }));
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCancelar() {
    if (!reservaFull || !confirm("¿Cancelar reserva?")) return;
    try {
      await fetch(`/api/admin/reservas/${reservaFull.id_reserva}/cancelar`, {
        method: "POST",
      });
      if (onCreated) onCreated();
      onClose();
    } catch {
      alert("Error al cancelar");
    }
  }

  function openCobro() {
    if (reservaFull) {
      const deuda = Number((reservaFull as any).saldo_pendiente || 0);
      setCobroMonto(deuda > 0 ? deuda : 0);
      setShowCobro(true);
    }
  }

  async function handleCobrar() {
    if (!reservaFull) return;
    setCobroLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reservas/${reservaFull.id_reserva}/cobrar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: cobroMonto,
            currency: "ARS",
            provider: cobroMetodo,
            status: "approved",
            note: cobroNota,
          }),
        },
      );
      if (!res.ok) throw new Error("Error cobrando");
      if (onCreated) onCreated();
      setShowCobro(false);
    } catch (e: any) {
      setCobroError(e.message);
    } finally {
      setCobroLoading(false);
    }
  }

  return {
    formData,
    setFormData,
    reserva: reservaFull,
    showCobro,
    setShowCobro,
    cobroMonto,
    setCobroMonto,
    cobroMetodo,
    setCobroMetodo,
    cobroNota,
    setCobroNota,
    priceLoading,
    priceError,
    createLoading,
    createError,
    cobroLoading,
    cobroError,

    availableTimes, // auto
    manualDesdeOptions, // manual
    manualHastaOptions, // manual
    duracionManualCalculada, // manual

    canchaDisplay,
    fechaDisplay,
    horaFinCalculada,

    handleCreate,
    handleCancelar,
    openCobro,
    handleCobrar,
    getWhatsappLink,
  };
}
