import {
  User,
  Phone,
  MessageCircle,
  Clock,
  DollarSign,
  XCircle,
  CheckCircle2,
  Mail,
  StickyNote,
  Globe,
  UserCog,
} from "lucide-react";
import { formatMoney } from "../hooks/useReservaSidebar";
import type { ReservaUI } from "../types";

interface Props {
  reserva: ReservaUI;
  getWhatsappLink: (phone: string) => string;
  onEdit: () => void;
}

export default function ReservaDetails({
  reserva,
  getWhatsappLink,
  onEdit,
}: Props) {
  // Aseguramos compatibilidad si el backend no manda nulls
  const notas = reserva.notas || "";
  const email = reserva.cliente_email || "";
  const origen = reserva.origen || "web";
  const telefono = reserva.cliente_telefono || "Sin teléfono";

  return (
    <div className="space-y-6">
      {/* Sección Jugador */}
      <div className="relative">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-gray-800">Jugador</h3>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-green-700 border border-green-700 px-2 py-0.5 rounded hover:bg-green-50 transition-colors"
          >
            Editar
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {/* Nombre */}
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium">{reserva.cliente_nombre}</span>
          </div>

          {/* Teléfono y WhatsApp */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{telefono}</span>
            </div>
            {telefono !== "Sin teléfono" && (
              <a
                href={getWhatsappLink(telefono)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-green-600 font-medium hover:underline cursor-pointer ml-6 text-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Enviar WhatsApp
              </a>
            )}
          </div>

          {/* Email (Nuevo) */}
          {email && (
            <div className="flex items-center gap-2 text-gray-700 overflow-hidden">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate" title={email}>
                {email}
              </span>
            </div>
          )}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Sección Detalles Turno */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Turno</h3>
        <ul className="space-y-3 text-sm text-gray-600">
          {/* Horario */}
          <li className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              {reserva.horaInicio} - {reserva.horaFin}
            </span>
          </li>

          {/* Origen (Nuevo) */}
          <li className="flex items-center gap-2 capitalize">
            {origen === "web" || origen === "app" ? (
              <Globe className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <UserCog className="w-4 h-4 text-orange-400 shrink-0" />
            )}
            <span>
              Reservado vía:{" "}
              <strong>{origen === "admin" ? "Administración" : origen}</strong>
            </span>
          </li>

          {/* Precios */}
          <li className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              Precio:{" "}
              <span className="text-green-600 font-bold">
                {formatMoney(reserva.precio_total)}
              </span>
            </span>
          </li>

          {/* Estado de Pagos */}
          <li className="bg-gray-50 p-2 rounded-lg border border-gray-100">
            <div className="flex justify-between items-center mb-1">
              <span>Pagado:</span>
              <span className="font-semibold text-gray-700">
                {formatMoney(reserva.pagos_aprobados_total)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Saldo:</span>
              <span
                className={`font-bold ${
                  reserva.saldo_pendiente > 0 ? "text-red-500" : "text-gray-400"
                }`}
              >
                {formatMoney(reserva.saldo_pendiente)}
              </span>
            </div>
          </li>
        </ul>
      </div>

      {/* Sección Notas (Nueva) */}
      {notas && (
        <>
          <hr className="border-gray-100" />
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <StickyNote className="w-3 h-3" /> Notas Internas
            </h3>
            {/* CORRECCIÓN ESLINT: Usamos &quot; en lugar de " */}
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm border border-yellow-100 italic">
              &quot;{notas}&quot;
            </div>
          </div>
        </>
      )}

      <hr className="border-gray-100" />

      {/* Sección Historial (Simplificada) */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Historial Jugador
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <XCircle className="w-4 h-4 text-gray-400 shrink-0" /> No tiene
            deudas
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Asistencia perfecta
          </div>
        </div>
      </div>
    </div>
  );
}
