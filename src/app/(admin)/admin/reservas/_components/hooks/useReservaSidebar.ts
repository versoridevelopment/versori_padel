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

  // ✅ nuevo esquema on-demand
  reservaId?: number | null;
  initialData?: Partial<ReservaUI>;

  isCreating: boolean;
  selectedDate: Date;

  preSelectedCanchaId?: number | null;
  preSelectedTime?: number | null;

  idClub: number;
  canchas: CanchaUI[];
  reservas?: ReservaUI[];

  startHour?: number;
  endHour?: number;

  onCreated: () => void;
};

// ===== Helpers exportables =====
export const formatMoney = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(val || 0));

function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// "HH:MM" -> decimal, respetando ventana startHour..endHour (posible +24)
function hhmmToDecimal(hhmm: string, startHour: number) {
  const [h, m] = (hhmm || "").slice(0, 5).split(":").map(Number);
  let dec = (h || 0) + (m || 0) / 60;
  if (dec < startHour) dec += 24; // pertenece al día+1 dentro de la ventana
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

/** ===== Regla anti “30 colgados” robusta (en unidades de 30’) ===== */
type IntervalU = { startU: number; endU: number }; // [startU, endU)
type FreeBlockU = { startU: number; endU: number }; // bloque libre máximo

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

// bloques libres máximos dentro de [dayStartU, dayEndU)
function buildFreeBlocks(dayStartU: number, dayEndU: number, occupiedU: IntervalU[]): FreeBlockU[] {
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

/**
 * ✅ regla correcta:
 * bloqueamos SOLO si deja exactamente 1 unit (30') libre
 * al inicio o al final del bloque libre máximo donde cae.
 */
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
    preSelectedCanchaId,
    preSelectedTime,
    idClub,
    canchas,
    reservas = [],
    startHour = 8,
    endHour = 26,
    onCreated,

    // ✅ nuevo
    reservaId,
    initialData,
  } = props;

  const fechaISO = useMemo(() => toISODateLocal(selectedDate), [selectedDate]);

  // =========================================================
  // Reserva “full” (on-demand)
  // =========================================================
  const [reservaFull, setReservaFull] = useState<ReservaUI | null>(null);

  // 1) Cuando abre en view: setear “light” inmediato
  useEffect(() => {
    if (!isOpen || isCreating) return;

    // Si viene initialData, armamos un ReservaUI parcial “cast”
    // (la UI de details suele tolerar nulls / strings vacíos; si no, ajustamos)
    if (initialData) {
      setReservaFull((prev) => {
        // si ya tenemos full del mismo id, no lo pises
        const prevId = Number((prev as any)?.id_reserva || 0);
        const nextId = Number((initialData as any)?.id_reserva || reservaId || 0);
        if (prev && prevId && nextId && prevId === nextId) return prev;
        return (initialData as ReservaUI) ?? null;
      });
    } else {
      // Si no hay initialData, limpiamos y esperamos fetch
      setReservaFull(null);
    }
  }, [isOpen, isCreating, initialData, reservaId]);

  // 2) Fetch full por id
  // 2) Fetch full por id
    useEffect(() => {
        let alive = true;

        async function loadFull() {
            if (!isOpen || isCreating) return;

            const id = Number(reservaId || (initialData as any)?.id_reserva || 0);
            if (!id) return;

            try {
            const res = await fetch(`/api/admin/reservas/${id}`, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!alive) return;

            // ✅ soportar TODOS los formatos
            const full = (json?.data ?? json?.reserva ?? json) as ReservaUI | null;

            if (res.ok && full && Number((full as any).id_reserva || 0) === id) {
                setReservaFull(full);
            }
            } catch {
            // mantener initialData
            }
        }

        loadFull();
        return () => {
            alive = false;
        };
    }, [isOpen, isCreating, reservaId, initialData]); // ✅ agregá initialData


  // =========================================================
  // Cobro
  // =========================================================
  const [showCobro, setShowCobro] = useState(false);
  const [cobroMonto, setCobroMonto] = useState<number>(0);
  const [cobroMetodo, setCobroMetodo] = useState<"efectivo" | "transferencia">("efectivo");
  const [cobroNota, setCobroNota] = useState<string>("Pagó en caja");
  const [cobroLoading, setCobroLoading] = useState(false);
  const [cobroError, setCobroError] = useState<string | null>(null);

  // =========================================================
  // Crear
  // =========================================================
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    esTurnoFijo: false,
    tipoTurno: "normal" as TipoTurno,
    duracion: 90 as 60 | 90 | 120,
    precio: 0,
    notas: "",
    canchaId: "",
    horaInicio: "",
  });

  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // =========================================================
  // 1) Ocuppied intervals (ventana +24 + fin_dia_offset)
  // =========================================================
  const occupiedIntervals = useMemo(() => {
    if (!isCreating) return [];

    const id_cancha = Number(formData.canchaId);
    if (!id_cancha) return [];

    const relevant = reservas.filter((r) => Number(r.id_cancha) === id_cancha);

    return relevant
      .map((r) => {
        const s = hhmmToDecimal(r.horaInicio, startHour);
        let e = hhmmToDecimal(r.horaFin, startHour);

        const offset = Number((r as any).fin_dia_offset || 0);
        if (offset === 1 || e <= s) e += 24;

        return { start: s, end: e, id: r.id_reserva };
      })
      .filter((x) => Number.isFinite(x.start) && Number.isFinite(x.end));
  }, [isCreating, reservas, formData.canchaId, startHour]);

  // =========================================================
  // 2) Available times (30’) + anti 30 colgados
  // =========================================================
  const availableTimes = useMemo(() => {
    if (!isOpen || !isCreating) return [];

    const durMin = Number(formData.duracion);
    if (![60, 90, 120].includes(durMin)) return [];

    const dayStartU = toUnits30(startHour);
    const dayEndU = toUnits30(endHour);
    const durU = Math.round(durMin / 30); // 60=2, 90=3, 120=4

    const occupiedU: IntervalU[] = occupiedIntervals.map((o) => ({
      startU: toUnits30(o.start),
      endU: toUnits30(o.end),
    }));

    const freeBlocks = buildFreeBlocks(dayStartU, dayEndU, occupiedU);

    const out: { value: string; label: string; decimal: number; finLabel: string }[] = [];

    for (let startU = dayStartU; startU + durU <= dayEndU; startU += 1) {
      const endU = startU + durU;

      const block = freeBlocks.find((b) => startU >= b.startU && endU <= b.endU);
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
  }, [isOpen, isCreating, formData.duracion, startHour, endHour, occupiedIntervals]);

  // =========================================================
  // 3) Preselect al abrir create
  // =========================================================
  useEffect(() => {
    if (!isOpen || !isCreating) return;

    const defaultCancha =
      preSelectedCanchaId?.toString() || (canchas[0]?.id_cancha?.toString() ?? "");

    setFormData((prev) => ({
      ...prev,
      canchaId: defaultCancha,
      duracion: prev.duracion || 90,
    }));

    setPriceError(null);
    setCreateError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isCreating, preSelectedCanchaId]);

  useEffect(() => {
    if (!isOpen || !isCreating) return;

    if (availableTimes.length === 0) {
      setFormData((prev) => ({ ...prev, horaInicio: "" }));
      return;
    }

    const stillValid =
      formData.horaInicio && availableTimes.some((t) => t.value === formData.horaInicio);
    if (stillValid) return;

    if (preSelectedTime != null) {
      const desired = preSelectedTime;
      const found = availableTimes.find((t) => t.decimal >= desired) || availableTimes[0];
      setFormData((prev) => ({ ...prev, horaInicio: found.value }));
      return;
    }

    setFormData((prev) => ({ ...prev, horaInicio: availableTimes[0].value }));
  }, [isOpen, isCreating, availableTimes, preSelectedTime, formData.horaInicio]);

  // ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // =========================================================
  // Computados UI
  // =========================================================
  const canchaDisplay = useMemo(() => {
    if (isCreating) {
      const c = canchas.find((x) => x.id_cancha === Number(formData.canchaId));
      return c?.nombre || "Sin Cancha";
    }
    return canchas.find((x) => x.id_cancha === reservaFull?.id_cancha)?.nombre || "Cancha";
  }, [isCreating, canchas, formData.canchaId, reservaFull?.id_cancha]);

  const fechaDisplay = selectedDate.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  const horaFinCalculada = useMemo(() => {
    if (!formData.horaInicio) return "";
    return addMinutesHHMM(formData.horaInicio, Number(formData.duracion || 0));
  }, [formData.horaInicio, formData.duracion]);

  // =========================================================
  // Precio automático (acá backend debe contemplar corte 14:00)
  // =========================================================
  useEffect(() => {
    let alive = true;

    async function calc() {
      if (!isOpen || !isCreating) return;
      setPriceError(null);

      const id_cancha = Number(formData.canchaId);
      const inicio = formData.horaInicio;
      const dur = Number(formData.duracion);

      if (!id_cancha || !inicio || ![60, 90, 120].includes(dur)) return;

      const fin = addMinutesHHMM(inicio, dur);

      setPriceLoading(true);
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
        if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo calcular el precio");

        if (!alive) return;
        setFormData((prev) => ({
          ...prev,
          precio: Number(json.precio_total || 0),
        }));
      } catch (e: any) {
        if (!alive) return;
        setFormData((prev) => ({ ...prev, precio: 0 }));
        setPriceError(e?.message || "Error calculando precio");
      } finally {
        if (!alive) return;
        setPriceLoading(false);
      }
    }

    calc();
    return () => {
      alive = false;
    };
  }, [isOpen, isCreating, idClub, fechaISO, formData.canchaId, formData.horaInicio, formData.duracion]);

  // =========================================================
  // Acciones
  // =========================================================
  const getWhatsappLink = (phone: string) => `https://wa.me/${String(phone || "").replace(/\D/g, "")}`;

  async function handleCreate() {
    setCreateError(null);

    const id_cancha = Number(formData.canchaId);
    const inicio = formData.horaInicio;
    const dur = Number(formData.duracion);
    const fin = addMinutesHHMM(inicio, dur);

    if (!formData.nombre.trim()) return setCreateError("Nombre es requerido");
    if (!formData.telefono.trim()) return setCreateError("Teléfono es requerido");
    if (!id_cancha) return setCreateError("Seleccioná una cancha");
    if (!inicio) return setCreateError("Seleccioná un horario disponible");
    if (![60, 90, 120].includes(dur)) return setCreateError("Duración inválida");
    if (!Number.isFinite(Number(formData.precio)) || Number(formData.precio) <= 0) {
      return setCreateError("No hay precio válido para ese horario");
    }

    const stillAvailable = availableTimes.some((t) => t.value === inicio);
    if (!stillAvailable) return setCreateError("Ese horario ya no está disponible. Elegí otro.");

    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_club: idClub,
          id_cancha,
          fecha: fechaISO,
          inicio,
          duracion_min: dur,
          fin,
          cliente_nombre: formData.nombre.trim(),
          cliente_telefono: formData.telefono.trim(),
          cliente_email: formData.email.trim() || null,
          tipo_turno: formData.tipoTurno,
          notas: formData.notas.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo crear la reserva");

      onCreated();
    } catch (e: any) {
      setCreateError(e?.message || "Error creando reserva");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCancelar() {
    if (!reservaFull) return;
    if (!confirm("¿Cancelar esta reserva?")) return;

    try {
      const res = await fetch(`/api/admin/reservas/${reservaFull.id_reserva}/cancelar`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cancelar");
      onCreated();
    } catch (e: any) {
      alert(e?.message || "Error cancelando");
    }
  }

  function openCobro() {
    if (!reservaFull) return;
    setCobroError(null);
    setCobroMetodo("efectivo");
    setCobroNota("Pagó en caja");

    const sugerido = Number((reservaFull as any).saldo_pendiente ?? 0) > 0 ? Number((reservaFull as any).saldo_pendiente) : 0;
    setCobroMonto(sugerido);
    setShowCobro(true);
  }

  async function handleCobrar() {
    if (!reservaFull) return;

    const amount = Number(cobroMonto || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCobroError("Monto inválido");
      return;
    }

    setCobroLoading(true);
    setCobroError(null);
    try {
      const res = await fetch(`/api/admin/reservas/${reservaFull.id_reserva}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "ARS",
          provider: cobroMetodo,
          status: "approved",
          note: cobroNota?.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cobrar");

      setShowCobro(false);
      onCreated();
    } catch (e: any) {
      setCobroError(e?.message || "Error cobrando");
    } finally {
      setCobroLoading(false);
    }
  }

  return {
    formData,
    setFormData,

    // ✅ lo que consume tu ReservaSidebar.tsx
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

    availableTimes,
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
