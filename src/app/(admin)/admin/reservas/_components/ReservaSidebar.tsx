"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  X,
  Calendar,
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  MessageCircle,
  DollarSign,
  Clock,
  Users,
  PlusCircle,
  Copy,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { CanchaUI, ReservaUI } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaUI | null;
  isCreating: boolean;
  selectedDate: Date;
  preSelectedCanchaId?: number | null;
  preSelectedTime?: number | null;

  idClub: number;
  canchas: CanchaUI[];

  onCreated: () => void;
}

// Helpers
const formatMoney = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(val || 0));

const decimalTimeToString = (decimal: number) => {
  let h = Math.floor(decimal);
  const m = decimal % 1 === 0.5 ? "30" : "00";
  if (h >= 24) h -= 24;
  return `${h.toString().padStart(2, "0")}:${m}`;
};

function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMinutesHHMM(hhmm: string, addMin: number) {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m + addMin;
  // permitimos cruzar medianoche (total puede ser >= 1440)
  total = total % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function ReservaSidebar({
  isOpen,
  onClose,
  reserva,
  isCreating,
  selectedDate,
  preSelectedCanchaId,
  preSelectedTime,
  idClub,
  canchas,
  onCreated,
}: Props) {
  const fechaISO = useMemo(() => toISODateLocal(selectedDate), [selectedDate]);

  // --- ESTADOS CREAR ---
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    esTurnoFijo: false,
    tipoTurno: "normal", // normal, profesor, torneo...
    duracion: 90,
    precio: 0,
    notas: "",
    canchaId: "",
    horaInicio: "",
  });

  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Preselect al abrir create
  useEffect(() => {
    if (isOpen && isCreating) {
      const defaultCancha = preSelectedCanchaId?.toString() || (canchas[0]?.id_cancha?.toString() ?? "");
      const defaultHora = preSelectedTime != null ? decimalTimeToString(preSelectedTime) : "09:00";

      setFormData((prev) => ({
        ...prev,
        canchaId: defaultCancha,
        horaInicio: defaultHora,
        duracion: prev.duracion || 90,
      }));
      setPriceError(null);
      setCreateError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isCreating, preSelectedCanchaId, preSelectedTime]);

  // ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const canchaDisplay = useMemo(() => {
    if (isCreating) {
      const c = canchas.find((x) => x.id_cancha === Number(formData.canchaId));
      return c?.nombre || "Sin Cancha";
    }
    return canchas.find((x) => x.id_cancha === reserva?.id_cancha)?.nombre || "Cancha";
  }, [isCreating, canchas, formData.canchaId, reserva?.id_cancha]);

  const fechaDisplay = selectedDate.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  const horaFin = useMemo(() => {
    if (!formData.horaInicio) return "";
    return addMinutesHHMM(formData.horaInicio, Number(formData.duracion || 0));
  }, [formData.horaInicio, formData.duracion]);

  // --- PRECIO AUTOMÁTICO ---
  useEffect(() => {
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
            // Si tu endpoint ya soporta override por admin, podés pasar:
            // segmento_override: "publico" | "profe"
          }),
        });

        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo calcular el precio");

        setFormData((prev) => ({
          ...prev,
          precio: Number(json.precio_total || 0),
        }));
      } catch (e: any) {
        setFormData((prev) => ({ ...prev, precio: 0 }));
        setPriceError(e?.message || "Error calculando precio");
      } finally {
        setPriceLoading(false);
      }
    }

    calc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isCreating, idClub, fechaISO, formData.canchaId, formData.horaInicio, formData.duracion]);

  // Whatsapp Generator
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
    if (!inicio) return setCreateError("Seleccioná hora de inicio");
    if (![60, 90, 120].includes(dur)) return setCreateError("Duración inválida");
    if (!Number.isFinite(Number(formData.precio)) || Number(formData.precio) <= 0) {
      return setCreateError("No hay precio válido para ese horario");
    }

    setCreateLoading(true);
    try {
      // AJUSTÁ ESTA URL si tu endpoint de crear se llama distinto
      const res = await fetch("/api/admin/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_club: idClub,
          id_cancha,
          fecha: fechaISO,
          inicio,
          duracion_min: dur,   // ✅ <-- AGREGAR ESTO
          fin,                 // opcional
          cliente_nombre: formData.nombre.trim(),
          cliente_telefono: formData.telefono.trim(),
          cliente_email: formData.email.trim() || null,
          tipo_turno: formData.tipoTurno,
          notas: formData.notas.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo crear la reserva");

      onCreated();
    } catch (e: any) {
      setCreateError(e?.message || "Error creando reserva");
    } finally {
      setCreateLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-start sticky top-0 z-10">
          <div>
            {isCreating ? (
              <>
                <h2 className="text-xl font-bold text-gray-800">
                  Crear Turno {formData.horaInicio ? `${formData.horaInicio}hs` : ""}
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {canchaDisplay}
                  </span>
                  <span className="flex items-center gap-1 capitalize">
                    <Calendar className="w-3.5 h-3.5" /> {fechaDisplay}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    Id: {reserva?.id_reserva}
                  </span>
                  <button className="text-gray-400 hover:text-gray-600" type="button">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Turno {reserva?.horaInicio} hs</h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span>{canchaDisplay}</span>
                  <span className="capitalize">
                    {new Date(reserva?.fecha || "").toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })}
                  </span>
                  <LinkAction text="Modificar día/hora" />
                </div>
              </>
            )}
          </div>

          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          {isCreating ? (
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              {/* JUGADOR */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-800">Jugador</h3>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 bottom-0 px-3 bg-green-600 rounded-r-lg text-white hover:bg-green-700"
                      aria-label="Buscar jugador"
                    >
                      <User className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-500 text-sm">
                      🇦🇷 +54
                    </span>
                    <input
                      type="tel"
                      className="flex-1 pl-3 pr-10 py-2 bg-gray-50 border border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="11 2345-6789"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 bottom-0 px-3 bg-green-600 rounded-r-lg text-white hover:bg-green-700"
                      aria-label="Llamar"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Email (opcional)</label>
                  <div className="relative">
                    <input
                      type="email"
                      className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <div className="absolute right-0 top-0 bottom-0 px-3 flex items-center bg-green-600 rounded-r-lg text-white">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* TURNO */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800">Características del Turno</h3>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Cancha</label>
                  <select
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
                    value={formData.canchaId}
                    onChange={(e) => setFormData({ ...formData, canchaId: e.target.value })}
                  >
                    <option value="">Seleccionar cancha</option>
                    {canchas.map((c) => (
                      <option key={c.id_cancha} value={String(c.id_cancha)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Hora inicio</label>
                  <input
                    type="time"
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
                    value={formData.horaInicio}
                    onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                  />
                  {horaFin && (
                    <p className="text-xs text-slate-500 mt-1">
                      Fin estimado: <span className="font-bold">{horaFin}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fijo"
                    checked={formData.esTurnoFijo}
                    onChange={(e) => setFormData({ ...formData, esTurnoFijo: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="fijo" className="text-sm text-gray-600">
                    Turno fijo
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">Tipo de turno</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Normal", "Profesor", "Torneo", "Escuela", "Cumpleaños", "Abonado"].map((tipo) => {
                      const v = tipo.toLowerCase().replace("ñ", "n");
                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setFormData({ ...formData, tipoTurno: v })}
                          className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-all
                            ${
                              formData.tipoTurno === v
                                ? "bg-gray-200 border-gray-300 text-gray-800 shadow-inner"
                                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                        >
                          {tipo}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Duración</label>
                  <select
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
                    value={formData.duracion}
                    onChange={(e) => setFormData({ ...formData, duracion: Number(e.target.value) })}
                  >
                    <option value={60}>60 minutos</option>
                    <option value={90}>90 minutos</option>
                    <option value={120}>120 minutos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Precio</label>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-gray-800">{formatMoney(formData.precio)}</div>
                    {priceLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                  </div>
                  {priceError && (
                    <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {priceError}
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    El precio se calcula automáticamente según el tarifario y reglas.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Notas</label>
                  <textarea
                    rows={2}
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                {createError && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                    {createError}
                  </div>
                )}
              </div>
            </form>
          ) : reserva ? (
            /* DETALLE */
            <div className="space-y-6">
              {/* JUGADOR */}
              <div className="relative">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-semibold text-gray-800">Jugador</h3>
                  <button className="text-xs text-green-700 border border-green-700 px-2 py-0.5 rounded hover:bg-green-50">
                    Editar
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{reserva.cliente_nombre}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{reserva.cliente_telefono}</span>
                  </div>
                  <a
                    href={getWhatsappLink(reserva.cliente_telefono)}
                    target="_blank"
                    className="flex items-center gap-2 text-green-600 font-medium hover:underline cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contactar por WhatsApp
                  </a>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* HISTORIAL (placeholder UI) */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Historial</h3>
                <div className="space-y-2">
                  {/* Esto hoy lo estás simulando: cuando tengas endpoint real lo cambiamos */}
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <XCircle className="w-4 h-4 text-gray-400" /> No tiene deudas
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" /> No se presentó veces: 0
                  </div>
                  <p className="text-xs text-green-600 mt-2 hover:underline cursor-pointer">Ver historial completo</p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* TURNO */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-3">Turno</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>
                      {reserva.horaInicio} - {reserva.horaFin}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>
                      Precio{" "}
                      <span className="text-green-600 font-bold">{formatMoney(reserva.precio_total)}</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>
                      Pagado: <strong>{formatMoney(reserva.pagos_aprobados_total)}</strong> — Saldo:{" "}
                      <strong>{formatMoney(reserva.saldo_pendiente)}</strong>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-white border-t border-gray-200">
          {isCreating ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-full text-sm font-bold hover:bg-gray-50"
                disabled={createLoading}
              >
                Cerrar
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-600 shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                disabled={createLoading || priceLoading || !formData.precio}
              >
                {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button className="py-2.5 bg-pink-600 text-white rounded-full text-sm font-bold hover:bg-pink-700">
                Reportar
              </button>
              <button className="py-2.5 bg-pink-600 text-white rounded-full text-sm font-bold hover:bg-pink-700">
                Cancelar
              </button>
              <button className="col-span-2 py-2.5 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-600 shadow-lg">
                Cobrar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const LinkAction = ({ text }: { text: string }) => (
  <span className="text-green-600 hover:underline cursor-pointer text-xs font-medium">{text}</span>
);
