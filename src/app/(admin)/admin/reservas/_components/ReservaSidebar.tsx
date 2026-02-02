"use client";

import {
  X,
  Calendar,
  Copy,
  Clock,
  Loader2,
  Printer,
  MapPin,
  Hash,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { printReservaTicket } from "@/lib/printTicket";
import {
  useReservaSidebar,
  type ReservaSidebarProps,
} from "./hooks/useReservaSidebar";

import CreateReservaForm from "./sidebar/CreateReservaForm";
import ReservaDetails from "./sidebar/ReservaDetails";
import CobroModal from "./sidebar/CobroModal";
import EditReservaMoveForm from "./sidebar/EditReservaMoveForm";

// Helper de normalización local
const normalizeReserva = (r: any) => {
  if (!r) return null;
  return {
    ...r,
    horaInicio: r.horaInicio || r.inicio || "00:00",
    horaFin: r.horaFin || r.fin || "00:00",
    cliente_nombre: r.cliente_nombre || r.titulo || "Cliente sin nombre",
    precio_total: Number(r.precio_total || r.precio || 0),
    saldo_pendiente: Number(r.saldo_pendiente || r.saldo || 0),
    pagos_aprobados_total: Number(
      r.pagos_aprobados_total ||
        Number(r.precio || 0) - Number(r.saldo || 0) ||
        0,
    ),
    fecha: r.fecha || new Date().toISOString().split("T")[0],
  };
};

export default function ReservaSidebar(props: ReservaSidebarProps) {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  const {
    formData,
    setFormData,
    reserva: rawReserva,
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
    manualDesdeOptions,
    manualHastaOptions,
    duracionManualCalculada,
    canchaDisplay,
    fechaDisplay,
    horaFinCalculada, // ✅ Usamos esto para el título
    handleCreate,
    handleCancelar,
    openCobro,
    handleCobrar,
    getWhatsappLink,
  } = useReservaSidebar(props);

  const { isOpen, onClose, isCreating, onCreated, idClub } = props;
  const [isEditingMove, setIsEditingMove] = useState(false);

  // Reserva Segura
  const reserva = useMemo(() => normalizeReserva(rawReserva), [rawReserva]);

  const [clubData, setClubData] = useState<{
    nombre: string;
    direccion: string;
  }>({
    nombre: "",
    direccion: "",
  });

  useEffect(() => {
    async function fetchClubInfo() {
      if (!idClub) return;
      try {
        const { data: club } = await supabase
          .from("clubes")
          .select("nombre")
          .eq("id_club", idClub)
          .single();
        const { data: contacto } = await supabase
          .from("contacto")
          .select("id_contacto")
          .eq("id_club", idClub)
          .single();
        let direccionStr = "";
        if (contacto) {
          const { data: dir } = await supabase
            .from("direccion")
            .select("calle, altura_calle, barrio, id_localidad(nombre)")
            .eq("id_contacto", contacto.id_contacto)
            .single();
          if (dir) {
            // @ts-ignore
            const loc = dir.id_localidad?.nombre || "";
            direccionStr = `${dir.calle || ""} ${dir.altura_calle || ""} ${dir.barrio ? `- ${dir.barrio}` : ""} ${loc ? `(${loc})` : ""}`;
          }
        }
        setClubData({
          nombre: club?.nombre || "Club Deportivo",
          direccion: direccionStr || "",
        });
      } catch (err) {
        console.error("Error cargando datos del club", err);
      }
    }
    if (isOpen) fetchClubInfo();
  }, [idClub, isOpen, supabase]);

  // Sync Form Data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTime = (props as any).inicio || (props as any).selectedStart || "";
  const incomingTime = rawTime.length > 5 ? rawTime.slice(0, 5) : rawTime;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incomingCanchaId = (props as any).preSelectedCanchaId;

  useEffect(() => {
    if (isOpen && isCreating) {
      setFormData((prev) => {
        const timeChanged = incomingTime && prev.horaInicio !== incomingTime;
        const canchaChanged =
          incomingCanchaId && prev.canchaId !== incomingCanchaId.toString();
        if (timeChanged || canchaChanged) {
          return {
            ...prev,
            horaInicio: incomingTime || prev.horaInicio,
            canchaId: incomingCanchaId
              ? incomingCanchaId.toString()
              : prev.canchaId,
          };
        }
        return prev;
      });
    }
    if (!isOpen) setIsEditingMove(false);
  }, [isOpen, isCreating, incomingTime, incomingCanchaId, setFormData]);

  const handlePrintTicket = () => {
    if (!reserva) return;
    printReservaTicket({
      id_reserva: reserva.id_reserva,
      club_nombre: clubData.nombre,
      club_direccion: clubData.direccion,
      cliente_nombre: reserva.cliente_nombre,
      cancha_nombre: canchaDisplay,
      fecha: reserva.fecha,
      inicio: reserva.horaInicio,
      fin: reserva.horaFin,
      fin_dia_offset: 0,
      precio_total: reserva.precio_total,
      pagado: reserva.pagos_aprobados_total,
      saldo: reserva.saldo_pendiente,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col border-l border-slate-100">
        {/* --- HEADER ESTILIZADO --- */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex justify-between items-start sticky top-0 z-10 shrink-0">
          <div>
            {isCreating ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">
                    Nueva Reserva
                  </span>
                </div>

                {/* ✅ TITULO DE HORA CORREGIDO */}
                <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  {formData.horaInicio ? (
                    <>
                      <span>{formData.horaInicio}</span>
                      <span className="text-slate-300 font-light">-</span>
                      <span>{horaFinCalculada || "--:--"}</span>
                      <span className="text-sm font-normal text-slate-400 ml-1">
                        hs
                      </span>
                    </>
                  ) : (
                    "Seleccionar horario"
                  )}
                </h2>

                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1 font-medium">
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />{" "}
                    {canchaDisplay}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 capitalize">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />{" "}
                    {fechaDisplay}
                  </span>
                </div>
              </>
            ) : (
              // MODO VER / EDITAR
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-100 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> ID: {reserva?.id_reserva}
                  </span>
                  <button
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() =>
                      reserva?.id_reserva &&
                      navigator.clipboard.writeText(String(reserva.id_reserva))
                    }
                    title="Copiar ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  {isEditingMove ? (
                    "Modificar Turno"
                  ) : (
                    <>
                      {reserva?.horaInicio}{" "}
                      <span className="text-slate-300 font-light">-</span>{" "}
                      {reserva?.horaFin}{" "}
                      <span className="text-sm font-normal text-slate-400">
                        hs
                      </span>
                    </>
                  )}
                </h2>

                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1 font-medium">
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />{" "}
                    {canchaDisplay}
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 capitalize">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {reserva?.fecha
                      ? new Date(
                          reserva.fecha + "T12:00:00",
                        ).toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border border-slate-100"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- BODY CON SCROLL --- */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
          {isCreating ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CreateReservaForm
                idClub={idClub}
                formData={formData}
                setFormData={setFormData}
                canchas={props.canchas}
                availableTimes={availableTimes}
                manualDesdeOptions={manualDesdeOptions}
                manualHastaOptions={manualHastaOptions}
                duracionManualCalculada={duracionManualCalculada}
                horaFinCalculada={horaFinCalculada}
                priceLoading={priceLoading}
                priceError={priceError}
                createError={createError}
              />
            </div>
          ) : reserva ? (
            isEditingMove ? (
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
                  if (onCreated) onCreated();
                }}
              />
            ) : (
              <ReservaDetails
                reserva={reserva}
                getWhatsappLink={getWhatsappLink}
                onEdit={() => setIsEditingMove(true)}
              />
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
              <p className="text-sm font-medium">Cargando información...</p>
            </div>
          )}
        </div>

        {/* --- FOOTER DE ACCIONES --- */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
          {isCreating ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-slate-300 text-slate-700 bg-white rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                disabled={createLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="flex-[2] py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                disabled={
                  createLoading ||
                  !formData.horaInicio ||
                  (!formData.esTurnoFijo &&
                    (!formData.precioManual
                      ? priceLoading || !formData.precio
                      : !formData.precio || Number(formData.precio) <= 0))
                }
              >
                {createLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                Confirmar Reserva
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrintTicket}
                className="py-3 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 shadow-sm flex items-center justify-center gap-2 transition-all"
                disabled={!reserva}
              >
                <Printer className="w-4 h-4 text-slate-400" /> Ticket
              </button>
              <button
                onClick={handleCancelar}
                className="py-3 border border-rose-100 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-100 disabled:opacity-60 transition-colors"
                disabled={!reserva}
              >
                Cancelar
              </button>
              <button
                onClick={openCobro}
                className="col-span-2 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-60 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                disabled={!reserva}
              >
                <DollarSignIcon className="w-4 h-4" /> Registrar Cobro
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

// Icono local simple
function DollarSignIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" x2="12" y1="1" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
