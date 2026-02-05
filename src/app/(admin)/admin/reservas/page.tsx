"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Layers } from "lucide-react";

import CompactView from "./_components/CompactView";
import DateSelector from "./_components/DateSelector";
import ReservaSidebar from "./_components/ReservaSidebar";
import Legend from "./_components/Legend";
import type { AgendaApiResponse, ReservaUI } from "./_components/types";

function toISODateAR(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ✅ Día operativo: si es 00:00–02:59, sigue siendo “día anterior”
function getOperationalDate(cutoffHour = 3, base = new Date()) {
  const d = new Date(base);
  if (d.getHours() < cutoffHour) d.setDate(d.getDate() - 1);

  // Normalizar a medianoche local para que sea una “fecha” limpia
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export default function ReservasPage() {
  const OPERATIVE_CUTOFF_HOUR = 3;

  const [selectedDate, setSelectedDate] = useState(() =>
    getOperationalDate(OPERATIVE_CUTOFF_HOUR),
  );

  const [agenda, setAgenda] = useState<AgendaApiResponse | null>(null);
  const [idClub, setIdClub] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarState, setSidebarState] = useState<{
    isOpen: boolean;
    mode: "view" | "create";
    reservaId?: number | null;
    initialData?: Partial<ReservaUI>;
    preSelectedCanchaId?: number | null;
    preSelectedTime?: string | null;
    preSelectedDate?: string | null;
  }>({ isOpen: false, mode: "view" });

  const fechaISO = useMemo(() => toISODateAR(selectedDate), [selectedDate]);

  const handleHardRefresh = () => {
    window.location.reload();
  };

  async function loadAgenda() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/agenda?fecha=${fechaISO}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Error cargando agenda");
      }
      setAgenda(json);
      setIdClub(json.id_club);
    } catch (e: any) {
      setAgenda(null);
      setIdClub(null);
      setError(e?.message || "Error interno");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaISO]);

  const handleReservaClick = (r: ReservaUI) => {
    setSidebarState({
      isOpen: true,
      mode: "view",
      reservaId: r.id_reserva,
      initialData: r,
      preSelectedDate: r.fecha,
    });
  };

  const handleEmptySlotClick = (canchaId: number, timeStr: string, dateStr: string) => {
    setSidebarState({
      isOpen: true,
      mode: "create",
      reservaId: null,
      initialData: undefined,
      preSelectedCanchaId: canchaId,
      preSelectedTime: timeStr,
      preSelectedDate: dateStr,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] md:h-screen bg-slate-50 font-sans overflow-hidden">
      {/* --- HEADER --- */}
      {/* z-20 es menor que el z-30 del backdrop del sidebar, arreglando la superposición */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-center gap-2 shrink-0 relative z-20 shadow-sm">
        {/* Fila 1: Título + Botón Crear (Móvil) */}
        {/* pl-10 da espacio al botón hamburguesa del sidebar */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4 pl-10 md:pl-0">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-2 rounded-lg text-white shadow-md hidden sm:block">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-none">
                Agenda
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">
                Gestión de Turnos
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              setSidebarState({
                isOpen: true,
                mode: "create",
                reservaId: null,
                preSelectedDate: fechaISO,
              })
            }
            className="md:hidden bg-slate-900 text-white p-2 rounded-lg active:scale-95 transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Fila 2: Selector de Fecha (Centrado y Ajustado) */}
        <div className="w-full md:w-auto flex justify-center relative z-30">
          <div className="bg-white p-0.5 rounded-xl border border-slate-200 shadow-sm w-full max-w-[280px] md:max-w-none md:w-auto">
            <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />
          </div>
        </div>

        {/* Fila 3: Acciones Escritorio */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleHardRefresh}
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-2 border border-transparent hover:border-slate-200"
            title="Recargar página completa"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="text-xs font-bold uppercase">Actualizar</span>
          </button>

          <div className="h-8 w-px bg-slate-200 mx-1" />

          <button
            onClick={() =>
              setSidebarState({
                isOpen: true,
                mode: "create",
                reservaId: null,
                preSelectedDate: fechaISO,
              })
            }
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-slate-900/10 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nuevo Turno
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 relative z-0 flex flex-col min-h-0 overflow-hidden">
        {loading && !agenda && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">
                Sincronizando...
              </span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="h-full grid place-items-center p-6 bg-white">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h2 className="font-bold text-slate-800 text-lg mb-2">Error de Carga</h2>
              <p className="text-sm text-slate-500 mb-6">{error}</p>
              <button
                onClick={loadAgenda}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL: GRILLA + LEYENDA */}
        {agenda && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Grilla */}
            <div
              className={`flex-1 min-h-0 transition-opacity duration-300 ${
                loading ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              <CompactView
                canchas={agenda.canchas}
                reservas={agenda.reservas || []}
                startHour={agenda.startHour}
                endHour={agenda.endHour}
                date={selectedDate}
                onReservaClick={handleReservaClick}
                onEmptySlotClick={handleEmptySlotClick}
              />
            </div>

            {/* Leyenda Fija */}
            <div className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 pb-safe">
              <Legend />
            </div>
          </div>
        )}
      </main>

      <ReservaSidebar
        isOpen={sidebarState.isOpen}
        onClose={() => setSidebarState((prev) => ({ ...prev, isOpen: false }))}
        reservaId={sidebarState.reservaId}
        initialData={sidebarState.initialData}
        isCreating={sidebarState.mode === "create"}
        selectedDate={selectedDate}
        fecha={sidebarState.preSelectedDate || fechaISO}
        preSelectedCanchaId={sidebarState.preSelectedCanchaId}
        preSelectedTime={sidebarState.preSelectedTime}
        idClub={idClub ?? agenda?.id_club ?? 0}
        canchas={agenda?.canchas || []}
        reservas={agenda?.reservas || []}
        startHour={agenda?.startHour ?? 8}
        endHour={agenda?.endHour ?? 26}
        onCreated={() => {
          setSidebarState((prev) => ({ ...prev, isOpen: false }));
          loadAgenda();
        }}
      />
    </div>
  );
}
