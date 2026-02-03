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
  Edit3,
  Save,
  DollarSign,
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

const normalizeReserva = (r: any) => {
  if (!r) return null;
  return {
    ...r,
    horaInicio: r.horaInicio || r.inicio || "00:00",
    horaFin: r.horaFin || r.fin || "00:00",
    cliente_nombre: r.cliente_nombre || r.titulo || "Cliente sin nombre",
    precio_total: Number(r.precio_total || r.precio || 0),
    saldo_pendiente: Number(r.saldo_pendiente || r.saldo || 0),
    pagos_aprobados_total: Number(r.pagos_aprobados_total || 0),
    fecha: r.fecha || new Date().toISOString().split("T")[0],
    origen: r.origen || "admin",
    notas: r.notas || "",
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
    horaFinCalculada,
    handleCreate,
    handleCancelar,
    openCobro,
    handleCobrar,
    getWhatsappLink,
  } = useReservaSidebar(props);

  const { isOpen, onClose, isCreating, onCreated, idClub } = props;
  const [isEditingMove, setIsEditingMove] = useState(false);

  // Gestión de Notas
  const [editNotas, setEditNotas] = useState("");
  const [isSavingNotas, setIsSavingNotas] = useState(false);

  const reserva = useMemo(() => normalizeReserva(rawReserva), [rawReserva]);

  useEffect(() => {
    if (reserva) setEditNotas(reserva.notas);
  }, [reserva]);

  const [clubData, setClubData] = useState<{
    nombre: string;
    direccion: string;
  }>({
    nombre: "",
    direccion: "",
  });

  // Recuperar info del club para el ticket
  useEffect(() => {
    async function fetchClubInfo() {
      if (!idClub || !isOpen) return;
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
          .maybeSingle();
        let direccionStr = "";
        if (contacto) {
          const { data: dir } = await supabase
            .from("direccion")
            .select("calle, altura_calle, barrio, id_localidad(nombre)")
            .eq("id_contacto", contacto.id_contacto)
            .maybeSingle();
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
    fetchClubInfo();
  }, [idClub, isOpen, supabase]);

  // ✅ Función de impresión restaurada
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

  const handleUpdateNotas = async () => {
    if (!reserva?.id_reserva) return;
    setIsSavingNotas(true);
    try {
      const { error } = await supabase
        .from("reservas")
        .update({ notas: editNotas })
        .eq("id_reserva", reserva.id_reserva);
      if (error) throw error;
      if (onCreated) onCreated();
    } catch (err) {
      console.error("Error actualizando notas", err);
    } finally {
      setIsSavingNotas(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100 font-sans">
        {/* HEADER */}
        <div className="px-6 py-5 bg-white border-b border-slate-100 flex justify-between items-start sticky top-0 z-10">
          <div>
            {!isCreating && reserva && !isEditingMove && (
              <button
                onClick={() => setIsEditingMove(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 mb-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Turno
              </button>
            )}

            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {isCreating
                ? formData.horaInicio
                  ? `${formData.horaInicio} - ${horaFinCalculada}`
                  : "Nuevo Turno"
                : isEditingMove
                  ? "Mover Turno"
                  : `${reserva?.horaInicio} - ${reserva?.horaFin}`}
            </h2>

            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1 font-medium">
              <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />{" "}
                {canchaDisplay}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />{" "}
                {isCreating ? fechaDisplay : reserva?.fecha}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
          {isCreating ? (
            <CreateReservaForm
              {...{
                idClub,
                formData,
                setFormData,
                canchas: props.canchas,
                availableTimes,
                manualDesdeOptions,
                manualHastaOptions,
                duracionManualCalculada,
                horaFinCalculada,
                priceLoading,
                priceError,
                createError,
              }}
            />
          ) : reserva ? (
            isEditingMove ? (
              <EditReservaMoveForm
                reserva={reserva}
                idClub={idClub}
                canchas={props.canchas}
                reservas={props.reservas || []}
                onCancel={() => setIsEditingMove(false)}
                onSaved={() => {
                  setIsEditingMove(false);
                  if (onCreated) onCreated();
                }}
              />
            ) : (
              <div className="space-y-6">
                <ReservaDetails
                  reserva={reserva}
                  getWhatsappLink={getWhatsappLink}
                />

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Notas Internas
                    </label>
                    {editNotas !== (reserva.notas || "") && (
                      <button
                        onClick={handleUpdateNotas}
                        disabled={isSavingNotas}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded transition-colors"
                      >
                        {isSavingNotas ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Guardar Notas
                      </button>
                    )}
                  </div>
                  <textarea
                    value={editNotas}
                    onChange={(e) => setEditNotas(e.target.value)}
                    placeholder="Sin notas adicionales..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all resize-none min-h-[100px]"
                  />
                </div>
              </div>
            )
          ) : (
            <div className="flex justify-center mt-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
          )}
        </div>

        {/* FOOTER ACCIONES */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
          {isCreating ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border bg-white rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="flex-[2] py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 active:scale-95 transition-all"
              >
                {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                Confirmar Turno
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrintTicket}
                className="py-3 border bg-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-400" /> Ticket
              </button>
              <button
                onClick={handleCancelar}
                className="py-3 border border-rose-100 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={openCobro}
                className="col-span-2 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all"
              >
                Registrar Cobro
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
