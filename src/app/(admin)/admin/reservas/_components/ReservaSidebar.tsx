"use client";

import { X, Calendar, Copy, Clock, Loader2, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import {
  useReservaSidebar,
  type ReservaSidebarProps,
} from "./hooks/useReservaSidebar";

import CreateReservaForm from "./sidebar/CreateReservaForm";
import ReservaDetails from "./sidebar/ReservaDetails";
import CobroModal from "./sidebar/CobroModal";
import EditReservaMoveForm from "./sidebar/EditReservaMoveForm";

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

  const { isOpen, onClose, isCreating } = props; // Quité props que no se usaban directamente aquí

  const [isEditingMove, setIsEditingMove] = useState(false);

  // 1. Extraer y Normalizar hora (asegurar HH:mm)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTime = (props as any).inicio || (props as any).selectedStart || "";
  const incomingTime = rawTime.length > 5 ? rawTime.slice(0, 5) : rawTime;

  // ✅ SOLUCIÓN DEFINITIVA PARA SINCRONIZACIÓN DE HORA
  useEffect(() => {
    // Solo ejecutamos si el sidebar está abierto y estamos en modo CREAR
    if (isOpen && isCreating && incomingTime) {
      setFormData((prev) => {
        // Si la hora es distinta, actualizamos
        if (prev.horaInicio !== incomingTime) {
          console.log(
            "🔄 Actualizando hora de:",
            prev.horaInicio,
            "a:",
            incomingTime,
          );
          return {
            ...prev,
            horaInicio: incomingTime,
            // Opcional: Si quieres resetear el precio al cambiar de hora
            // precio: 0
          };
        }
        return prev;
      });
    }

    if (!isOpen) {
      setIsEditingMove(false);
    }
  }, [isOpen, isCreating, incomingTime, setFormData]);

  // ✅ TICKET
  const handlePrintTicket = () => {
    if (!reserva) return;

    const printWindow = window.open("", "PRINT", "height=650,width=450");

    if (printWindow) {
      const fechaImpresion = new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket #${reserva.id_reserva}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
              body { font-family: 'Roboto Mono', monospace; padding: 10px; margin: 0; background: #fff; color: #000; font-size: 12px; }
              .ticket { width: 100%; max-width: 300px; margin: 0 auto; }
              @media print { @page { margin: 0; } body { padding: 0; } button { display: none; } }
              .text-center { text-align: center; } .text-right { text-align: right; } .font-bold { font-weight: 700; }
              .text-lg { font-size: 16px; } .text-xl { font-size: 18px; } .uppercase { text-transform: uppercase; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .double-divider { border-top: 3px double #000; margin: 10px 0; }
              .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
              .box { border: 1px solid #000; padding: 5px; margin: 10px 0; text-align: center; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <div class="text-center">
                <div class="font-bold text-xl uppercase">COMPROBANTE</div>
                <div>Reserva #${reserva.id_reserva}</div>
                <div style="font-size: 10px; margin-top: 5px;">${fechaImpresion}</div>
              </div>
              <div class="double-divider"></div>
              <div class="row"><span>CLIENTE:</span><span class="font-bold text-right">${reserva.cliente_nombre || "Consumidor Final"}</span></div>
              <div class="row"><span>CANCHA:</span><span class="text-right">${canchaDisplay}</span></div>
              <div class="row"><span>FECHA:</span><span class="text-right">${fechaDisplay}</span></div>
              <div class="row"><span>HORARIO:</span><span class="font-bold text-right">${reserva.horaInicio} - ${reserva.horaFin}</span></div>
              <div class="divider"></div>
              <div class="row"><span>Concepto</span><span class="text-right">Alquiler Cancha</span></div>
              <div class="row font-bold text-lg" style="margin-top: 5px;"><span>TOTAL:</span><span>$${reserva.precio_total.toLocaleString("es-AR")}</span></div>
              <div class="divider"></div>
              <div class="row"><span>Pagado / Seña:</span><span>$${reserva.pagos_aprobados_total.toLocaleString("es-AR")}</span></div>
              <div class="box">
                <div style="font-size: 10px;">SALDO PENDIENTE</div>
                <div class="font-bold text-xl">$${reserva.saldo_pendiente.toLocaleString("es-AR")}</div>
              </div>
              <div class="text-center" style="margin-top: 20px; font-size: 10px;">
                <p>GRACIAS POR SU VISITA</p>
                <p>No válido como factura fiscal.</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  if (!isOpen) return null;

  const inViewMode = !isCreating && !!reserva;
  const showEditForm = inViewMode && isEditingMove;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-start sticky top-0 z-10">
          <div>
            {isCreating ? (
              <>
                <h2 className="text-xl font-bold text-gray-800">
                  Crear Turno{" "}
                  {formData.horaInicio ? `${formData.horaInicio}hs` : ""}
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
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    type="button"
                    title="Copiar ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {isEditingMove
                    ? "Editar turno"
                    : `Turno ${reserva?.horaInicio} hs`}
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span>{canchaDisplay}</span>
                  <span className="capitalize">
                    {new Date(reserva?.fecha || "").toLocaleDateString(
                      "es-AR",
                      { weekday: "short", day: "numeric" },
                    )}
                  </span>
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

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          {isCreating ? (
            <CreateReservaForm
              formData={formData}
              setFormData={setFormData}
              canchas={props.canchas}
              availableTimes={availableTimes}
              horaFinCalculada={horaFinCalculada}
              priceLoading={priceLoading}
              priceError={priceError}
              createError={createError}
            />
          ) : reserva ? (
            showEditForm ? (
              <EditReservaMoveForm
                reserva={reserva}
                idClub={props.idClub}
                canchas={props.canchas}
                reservas={props.reservas || []}
                startHour={props.startHour ?? 8}
                endHour={props.endHour ?? 26}
                onCancel={() => setIsEditingMove(false)}
                onSaved={() => {
                  setIsEditingMove(false);
                  onCreated();
                }}
              />
            ) : (
              <ReservaDetails
                reserva={reserva}
                getWhatsappLink={getWhatsappLink}
                onEdit={() => setIsEditingMove(true)}
              />
            )
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
                disabled={
                  createLoading ||
                  (!formData.esTurnoFijo &&
                    (priceLoading || !formData.precio)) ||
                  !formData.horaInicio ||
                  availableTimes.length === 0
                }
              >
                {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrintTicket}
                className="py-2.5 border border-gray-300 text-gray-700 rounded-full text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
                title="Generar Comprobante"
              >
                <Printer className="w-4 h-4" /> Ticket
              </button>
              <button
                onClick={handleCancelar}
                className="py-2.5 bg-pink-600 text-white rounded-full text-sm font-bold hover:bg-pink-700 disabled:opacity-60 transition-colors"
                disabled={!reserva}
              >
                Cancelar
              </button>
              <button
                onClick={openCobro}
                className="col-span-2 py-2.5 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-600 shadow-lg disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMetodo={setCobroMetodo as any}
        nota={cobroNota}
        setNota={setCobroNota}
        loading={cobroLoading}
        error={cobroError}
        onConfirm={handleCobrar}
      />
    </>
  );
}
