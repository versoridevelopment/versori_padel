"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Reserva, MOCK_CANCHAS } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reserva: Reserva | null;
  isCreating: boolean;
  selectedDate: Date;
  preSelectedCanchaId?: number | null;
  preSelectedTime?: number | null;
}

// Helpers
const formatMoney = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val);

const decimalTimeToString = (decimal: number) => {
  let h = Math.floor(decimal);
  const m = decimal % 1 === 0.5 ? "30" : "00";
  if (h >= 24) h -= 24;
  return `${h.toString().padStart(2, "0")}:${m}`;
};

export default function ReservaSidebar({
  isOpen,
  onClose,
  reserva,
  isCreating,
  selectedDate,
  preSelectedCanchaId,
  preSelectedTime,
}: Props) {
  // --- ESTADOS DE FORMULARIO (NUEVA RESERVA) ---
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    deporte: "Pádel",
    esTurnoFijo: false,
    tipoTurno: "normal", // normal, profesor, torneo, escuela...
    duracion: 90,
    precio: 36000,
    notas: "",
    canchaId: "",
    horaInicio: "",
  });

  // Efecto para Autocompletar datos al abrir "Nueva Reserva"
  useEffect(() => {
    if (isOpen && isCreating) {
      setFormData((prev) => ({
        ...prev,
        canchaId: preSelectedCanchaId?.toString() || "",
        horaInicio: preSelectedTime
          ? decimalTimeToString(preSelectedTime)
          : "09:00",
        // Aquí podrías lógica para buscar precio según horario en 'canchas_tarifas_reglas'
        precio: 36000,
      }));
    }
  }, [isOpen, isCreating, preSelectedCanchaId, preSelectedTime]);

  // Manejo de tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Whatsapp Generator
  const getWhatsappLink = (phone: string) =>
    `https://wa.me/${phone.replace(/\D/g, "")}`;

  // Nombre de cancha para display
  const canchaDisplay = isCreating
    ? MOCK_CANCHAS.find((c) => c.id === Number(formData.canchaId))?.nombre
    : reserva?.nombreCancha;

  const fechaDisplay = selectedDate.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col">
        {/* ================= HEADER ================= */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-start sticky top-0 z-10">
          <div>
            {isCreating ? (
              <>
                <h2 className="text-xl font-bold text-gray-800">
                  Crear Turno {formData.horaInicio}hs
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />{" "}
                    {canchaDisplay || "Sin Cancha"}
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
                    Id: {reserva?.id}
                  </span>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Turno {reserva?.horaInicio} hs
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span>{reserva?.nombreCancha}</span>
                  <span className="capitalize">
                    {new Date(reserva?.fecha || "").toLocaleDateString(
                      "es-AR",
                      { weekday: "short", day: "numeric" },
                    )}
                  </span>
                  <LinkAction text="Modificar día/hora" />
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ================= CONTENIDO ================= */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          {isCreating ? (
            /* --- FORMULARIO CREAR (Imagen 1) --- */
            <form className="space-y-6">
              {/* JUGADOR */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-800">
                  Jugador
                </h3>

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
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 bottom-0 px-3 bg-green-600 rounded-r-lg text-white hover:bg-green-700"
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
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 bottom-0 px-3 bg-green-600 rounded-r-lg text-white hover:bg-green-700"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-1 cursor-pointer hover:underline">
                    Ver jugadores
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Email (opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Email"
                    />
                    <div className="absolute right-0 top-0 bottom-0 px-3 flex items-center bg-green-600 rounded-r-lg text-white">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* CARACTERÍSTICAS */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800">
                  Características del Turno
                </h3>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Deporte <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-800 font-medium">Pádel</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fijo"
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="fijo" className="text-sm text-gray-600">
                    Turno fijo
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">
                    Tipo de turno
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      "Normal",
                      "Profesor",
                      "Torneo",
                      "Escuela",
                      "Cumpleaños",
                      "Abonado",
                    ].map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            tipoTurno: tipo.toLowerCase(),
                          })
                        }
                        className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-all
                                        ${
                                          formData.tipoTurno ===
                                          tipo.toLowerCase()
                                            ? "bg-gray-200 border-gray-300 text-gray-800 shadow-inner"
                                            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                        }`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Duración
                  </label>
                  <select
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
                    value={formData.duracion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duracion: Number(e.target.value),
                      })
                    }
                  >
                    <option value={60}>60 minutos</option>
                    <option value={90}>una hora y 30 minutos</option>
                    <option value={120}>120 minutos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Precio
                  </label>
                  <div className="text-sm font-bold text-gray-800">
                    {formatMoney(formData.precio)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Notas
                  </label>
                  <textarea
                    rows={2}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
            </form>
          ) : reserva ? (
            /* --- DETALLE RESERVA (Imagen 2) --- */
            <div className="space-y-6">
              {/* ESTADO GRANDE (Banner opcional según imagen 2, "Turno Finalizado") */}
              {reserva.estado === "confirmada" && (
                <div className="w-full py-2 bg-gray-400 text-white text-center text-xs font-bold uppercase rounded-md">
                  Este turno ya finalizó (Ejemplo)
                </div>
              )}

              {/* JUGADOR */}
              <div className="relative">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-semibold text-gray-800">
                    Jugador
                  </h3>
                  <button className="text-xs text-green-700 border border-green-700 px-2 py-0.5 rounded hover:bg-green-50">
                    Editar
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{reserva.clienteNombre}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{reserva.clienteTelefono}</span>
                  </div>
                  <a
                    href={getWhatsappLink(reserva.clienteTelefono)}
                    target="_blank"
                    className="flex items-center gap-2 text-green-600 font-medium hover:underline cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contactar por WhatsApp
                  </a>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* HISTORIAL (Requerimiento de imagen 2) */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Historial
                </h3>
                <div className="space-y-2">
                  {/* Lógica simulada de historial */}
                  {(reserva.clienteHistory?.deudas || 0) === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <XCircle className="w-4 h-4 text-gray-400" /> No tiene
                      deudas
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-red-600 font-bold">
                      <AlertCircle className="w-4 h-4" /> Tiene deuda pendiente
                    </div>
                  )}

                  {(reserva.clienteHistory?.ausencias || 0) === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" /> No se presentó veces:
                      0
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600" /> Se
                      presentó: {reserva.clienteHistory?.partidosJugados} veces
                    </div>
                  )}
                  <p className="text-xs text-green-600 mt-2 hover:underline cursor-pointer">
                    Ver historial completo
                  </p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* TURNO */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Turno
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>
                      Duración: <strong>una hora y 30 minutos</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 flex justify-center text-gray-400 font-bold">
                      ⚽
                    </span>
                    <span>
                      Deporte <strong>Pádel</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>
                      Precio{" "}
                      <span className="text-green-600 font-bold">
                        {formatMoney(reserva.precioTotal)}
                      </span>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>Cobro offline $ 0</span>
                  </li>
                  <li className="flex items-center gap-2 text-green-600 cursor-pointer hover:underline">
                    <Users className="w-4 h-4" />
                    <span>Lista de Jugadores</span>
                  </li>
                </ul>

                <div className="mt-3 text-xs text-gray-400 italic">
                  No hay consumos
                </div>
                <button className="mt-1 flex items-center gap-1 text-sm text-green-600 font-medium hover:underline">
                  <PlusCircle className="w-4 h-4" /> Agregar consumo
                </button>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                  Seña <br />
                  <span className="font-bold">
                    Valor {formatMoney(reserva.montoSenia)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="p-4 bg-white border-t border-gray-200">
          {isCreating ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-full text-sm font-bold hover:bg-gray-50"
              >
                Cerrar
              </button>
              <button className="flex-1 py-2.5 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-600 shadow-md">
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

// Mini componente para links de acción (estilo "Modificar día...")
const LinkAction = ({ text }: { text: string }) => (
  <span className="text-green-600 hover:underline cursor-pointer text-xs font-medium">
    {text}
  </span>
);
