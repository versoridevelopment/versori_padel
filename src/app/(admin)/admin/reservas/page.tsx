"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import CompactView from "./_components/CompactView";
import DateSelector from "./_components/DateSelector";
import ReservaSidebar from "./_components/ReservaSidebar";
import type { AgendaApiResponse, ReservaUI } from "./_components/types";

function toISODateAR(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReservasPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [agenda, setAgenda] = useState<AgendaApiResponse | null>(null);
  const [idClub, setIdClub] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Estado actualizado para manejar Carga On-Demand
  const [sidebarState, setSidebarState] = useState<{
    isOpen: boolean;
    mode: "view" | "create";
    reservaId?: number | null;        // Guardamos solo el ID
    initialData?: Partial<ReservaUI>; // Y los datos "light" de la grilla
    preSelectedCanchaId?: number | null;
    preSelectedTime?: number | null; 
  }>({ isOpen: false, mode: "view" });

  const fechaISO = useMemo(() => toISODateAR(selectedDate), [selectedDate]);

  async function loadAgenda() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/agenda?fecha=${fechaISO}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Error cargando agenda");
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

  // ✅ Al hacer click, guardamos ID e InitialData
  const handleReservaClick = (r: ReservaUI) => {
    setSidebarState({ 
      isOpen: true, 
      mode: "view", 
      reservaId: r.id_reserva,
      initialData: r 
    });
  };

  const handleEmptySlotClick = (canchaId: number, time: number) => {
    setSidebarState({
      isOpen: true,
      mode: "create",
      reservaId: null,
      initialData: undefined,
      preSelectedCanchaId: canchaId,
      preSelectedTime: time,
    });
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 z-40 relative shadow-sm">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Agenda</h1>

          <button
            onClick={() => setSidebarState({ isOpen: true, mode: "create", reservaId: null })}
            className="md:hidden bg-slate-900 text-white p-2 rounded-lg"
            aria-label="Nuevo Turno"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setSidebarState({ isOpen: true, mode: "create", reservaId: null })}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Turno
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {loading && <div className="h-full grid place-items-center text-sm text-slate-600">Cargando agenda…</div>}

        {!loading && error && (
          <div className="h-full grid place-items-center">
            <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm max-w-md w-full">
              <div className="font-bold text-red-700 mb-1">No se pudo cargar</div>
              <div className="text-sm text-slate-600">{error}</div>
              <button onClick={loadAgenda} className="mt-3 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold">
                Reintentar
              </button>
            </div>
          </div>
        )}

        {!loading && !error && agenda && (
          <CompactView
            canchas={agenda.canchas}
            reservas={agenda.reservas}
            startHour={agenda.startHour}
            endHour={agenda.endHour}
            onReservaClick={handleReservaClick}
            onEmptySlotClick={handleEmptySlotClick}
          />
        )}
      </main>

      {/* ✅ Pasamos los nuevos props al Sidebar */}
      <ReservaSidebar
        isOpen={sidebarState.isOpen}
        onClose={() => setSidebarState((prev) => ({ ...prev, isOpen: false }))}
        
        // Props clave para el nuevo sistema:
        reservaId={sidebarState.reservaId} 
        initialData={sidebarState.initialData}
        
        isCreating={sidebarState.mode === "create"}
        selectedDate={selectedDate}
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