import { X, Loader2 } from "lucide-react";
import { formatMoney } from "../hooks/useReservaSidebar";
import type { ReservaUI } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaUI | null;
  monto: number;
  setMonto: (v: number) => void;
  metodo: "efectivo" | "transferencia";
  setMetodo: (v: "efectivo" | "transferencia") => void;
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-black text-slate-800">Cobrar</div>
          <button className="p-2 rounded-lg hover:bg-gray-100" onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-sm text-slate-600">
            {reserva ? (
              <>
                Reserva #{reserva.id_reserva} — Saldo: <strong>{formatMoney(reserva.saldo_pendiente)}</strong>
              </>
            ) : (
              <>Seleccioná una reserva</>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Monto</label>
            <input
              type="number"
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              min={0}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Método</label>
            <select
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as any)}
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nota (opcional)</label>
            <input
              type="text"
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Pagó en caja"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-full text-sm font-bold hover:bg-gray-50"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
          <button
            className="flex-1 py-2.5 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-600 shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading || !reserva}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar cobro
          </button>
        </div>
      </div>
    </div>
  );
}