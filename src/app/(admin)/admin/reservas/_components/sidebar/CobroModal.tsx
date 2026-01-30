import {
  X,
  DollarSign,
  CreditCard,
  StickyNote,
  AlertCircle,
  Loader2,
} from "lucide-react";
// AJUSTA ESTOS IMPORTS SEGÚN TU ESTRUCTURA REAL
// Si CobroModal está en sidebar/, entonces types está dos niveles arriba
import type { ReservaUI } from "../../types";
import { formatMoney } from "../hooks/useReservaSidebar";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaUI | null;
  monto: number;
  setMonto: (v: number) => void;
  metodo: string;
  // Cambiamos el tipo para que acepte string o el tipo específico que venga del hook
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setMetodo: (v: any) => void;
  nota: string;
  setNota: (v: string) => void;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
}

export default function CobroModal({
  isOpen,
  onClose,
  reserva,
  monto,
  setMonto,
  metodo,
  setMetodo,
  nota,
  setNota,
  loading,
  error,
  onConfirm,
}: Props) {
  if (!isOpen || !reserva) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          title="Cerrar"
          aria-label="Cerrar modal de cobro"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Registrar Cobro</h3>
          <p className="text-sm text-gray-500">
            Reserva #{reserva.id_reserva} • Saldo:{" "}
            {formatMoney(reserva.saldo_pendiente)}
          </p>
        </div>

        <div className="space-y-4">
          {/* Input Monto */}
          <div>
            <label
              htmlFor="cobro-monto"
              className="block text-xs font-bold text-gray-500 uppercase mb-1"
            >
              Monto a cobrar
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                $
              </span>
              <input
                id="cobro-monto"
                type="number"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-medium"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Select Método */}
          <div>
            {/* CORRECCIÓN CSS: Quitamos 'block' porque ya usamos 'flex' */}
            <label
              htmlFor="cobro-metodo"
              className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-1"
            >
              <CreditCard className="w-3 h-3" /> Método de Pago
            </label>
            <select
              id="cobro-metodo"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="mercadopago">MercadoPago (QR/Link)</option>
            </select>
          </div>

          {/* Input Notas */}
          <div>
            {/* CORRECCIÓN CSS: Quitamos 'block' */}
            <label
              htmlFor="cobro-nota"
              className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-1"
            >
              <StickyNote className="w-3 h-3" /> Nota (Opcional)
            </label>
            <textarea
              id="cobro-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none h-20"
              placeholder="Detalles adicionales..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={onConfirm}
            disabled={loading || monto <= 0}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Confirmar Cobro"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
