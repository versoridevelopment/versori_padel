"use client";

import { X, Calendar, Copy, Clock, Loader2 } from "lucide-react";
import { useReservaSidebar, type ReservaSidebarProps } from "./hooks/useReservaSidebar";

import CreateReservaForm from "./sidebar/CreateReservaForm";
import ReservaDetails from "./sidebar/ReservaDetails";
import CobroModal from "./sidebar/CobroModal";

export default function ReservaSidebar(props: ReservaSidebarProps) {
  const {
    formData,
    setFormData,

    reserva,

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
  } = useReservaSidebar(props);

  const { isOpen, onClose, isCreating, canchas } = props;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col">
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
                    {new Date(reserva?.fecha || "").toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </>
            )}
          </div>

          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          {isCreating ? (
            <CreateReservaForm
              formData={formData}
              setFormData={setFormData}
              canchas={canchas}
              availableTimes={availableTimes}
              horaFinCalculada={horaFinCalculada}
              priceLoading={priceLoading}
              priceError={priceError}
              createError={createError}
            />
          ) : reserva ? (
            <ReservaDetails reserva={reserva} getWhatsappLink={getWhatsappLink} />
          ) : null}
        </div>

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
                disabled={createLoading || priceLoading || !formData.precio || !formData.horaInicio || availableTimes.length === 0}
              >
                {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button className="py-2.5 bg-pink-600 text-white rounded-full text-sm font-bold hover:bg-pink-700">Reportar</button>

              <button
                onClick={handleCancelar}
                className="py-2.5 bg-pink-600 text-white rounded-full text-sm font-bold hover:bg-pink-700 disabled:opacity-60"
                disabled={!reserva}
              >
                Cancelar
              </button>

              <button
                onClick={openCobro}
                className="col-span-2 py-2.5 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-600 shadow-lg disabled:opacity-60"
                disabled={!reserva}
              >
                Cobrar
              </button>
            </div>
          )}
        </div>
      </div>

      <CobroModal
        isOpen={showCobro}
        onClose={() => setShowCobro(false)}
        reserva={reserva}
        monto={cobroMonto}
        setMonto={setCobroMonto}
        metodo={cobroMetodo}
        setMetodo={setCobroMetodo}
        nota={cobroNota}
        setNota={setCobroNota}
        loading={cobroLoading}
        error={cobroError}
        onConfirm={handleCobrar}
      />
    </>
  );
}
