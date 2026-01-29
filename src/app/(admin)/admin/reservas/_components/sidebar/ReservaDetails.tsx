import { User, Phone, MessageCircle, Clock, DollarSign, XCircle, CheckCircle2 } from "lucide-react";
import { formatMoney } from "../hooks/useReservaSidebar";
import type { ReservaUI } from "../types";

interface Props {
  reserva: ReservaUI;
  getWhatsappLink: (phone: string) => string;
}

export default function ReservaDetails({ reserva, getWhatsappLink }: Props) {
  return (
    <div className="space-y-6">
      {/* Sección Jugador */}
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
            rel="noreferrer"
            className="flex items-center gap-2 text-green-600 font-medium hover:underline cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            Contactar por WhatsApp
          </a>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Sección Historial */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Historial</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <XCircle className="w-4 h-4 text-gray-400" /> No tiene deudas
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" /> No se presentó veces: 0
          </div>
          <p className="text-xs text-green-600 mt-2 hover:underline cursor-pointer">
            Ver historial completo
          </p>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Sección Detalles Turno */}
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
              Precio <span className="text-green-600 font-bold">{formatMoney(reserva.precio_total)}</span>
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
  );
}