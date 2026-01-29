import { User, Phone, Mail, AlertCircle, Loader2 } from "lucide-react";
import { formatMoney } from "../hooks/useReservaSidebar"; // Importar el helper
import type { CanchaUI } from "../types"; // Ajustar ruta types

interface Props {
  formData: any;
  setFormData: (d: any) => void;
  canchas: CanchaUI[];
  availableTimes: { value: string; label: string; finLabel: string }[];
  horaFinCalculada: string;
  priceLoading: boolean;
  priceError: string | null;
  createError: string | null;
}

export default function CreateReservaForm({
  formData,
  setFormData,
  canchas,
  availableTimes,
  horaFinCalculada,
  priceLoading,
  priceError,
  createError,
}: Props) {
  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {/* SECCIÓN JUGADOR */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-800">Jugador</h3>

        {/* Nombre */}
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
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Teléfono */}
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
            >
              <Phone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Email */}
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

      {/* SECCIÓN DATOS DEL TURNO */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800">Características del Turno</h3>

        {/* Cancha */}
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

        {/* Horarios */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Hora inicio</label>
          <select
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none disabled:opacity-60"
            value={formData.horaInicio}
            onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
            disabled={!formData.canchaId || availableTimes.length === 0}
          >
            {!formData.canchaId && <option value="">Elegí una cancha</option>}
            {formData.canchaId && availableTimes.length === 0 && (
              <option value="">No hay horarios disponibles</option>
            )}
            {availableTimes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} (fin {t.finLabel})
              </option>
            ))}
          </select>

          {horaFinCalculada && (
            <p className="text-xs text-slate-500 mt-1">
              Fin estimado: <span className="font-bold">{horaFinCalculada}</span>
            </p>
          )}
        </div>

        {/* Fijo Checkbox */}
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

        {/* Tipo de Turno */}
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

        {/* Duración */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Duración</label>
          <select
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none"
            value={formData.duracion}
            onChange={(e) => setFormData({ ...formData, duracion: Number(e.target.value) as any })}
          >
            <option value={60}>60 minutos</option>
            <option value={90}>90 minutos</option>
            <option value={120}>120 minutos</option>
          </select>
        </div>

        {/* Precio */}
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
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Notas</label>
          <textarea
            rows={2}
            value={formData.notas}
            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>

        {/* Error Global */}
        {createError && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            {createError}
          </div>
        )}
      </div>
    </form>
  );
}