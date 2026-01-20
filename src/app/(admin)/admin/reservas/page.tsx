"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MOCK_CANCHAS, MOCK_RESERVAS, Reserva } from "./_components/types";
import CompactView from "./_components/CompactView";
import DateSelector from "./_components/DateSelector";
import ReservaSidebar from "./_components/ReservaSidebar";

export default function ReservasPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [sidebarState, setSidebarState] = useState<{
    isOpen: boolean;
    mode: "view" | "create";
    data: Reserva | null;
    preSelectedCanchaId?: number | null;
    // Nuevo campo
    preSelectedTime?: number | null;
  }>({ isOpen: false, mode: "view", data: null });

  const handleReservaClick = (r: Reserva) => {
    setSidebarState({ isOpen: true, mode: "view", data: r });
  };

  // Callback actualizado con hora
  const handleEmptySlotClick = (canchaId: number, time: number) => {
    setSidebarState({
      isOpen: true,
      mode: "create",
      data: null,
      preSelectedCanchaId: canchaId,
      preSelectedTime: time,
    });
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 z-40 relative shadow-sm">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">
            Agenda
          </h1>
          <button
            onClick={() =>
              setSidebarState({ isOpen: true, mode: "create", data: null })
            }
            className="md:hidden bg-slate-900 text-white p-2 rounded-lg"
            aria-label="Nuevo Turno"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() =>
              setSidebarState({ isOpen: true, mode: "create", data: null })
            }
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Turno
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <CompactView
          canchas={MOCK_CANCHAS}
          reservas={MOCK_RESERVAS}
          onReservaClick={handleReservaClick}
          onEmptySlotClick={handleEmptySlotClick}
        />
      </main>

      <ReservaSidebar
        isOpen={sidebarState.isOpen}
        onClose={() => setSidebarState((prev) => ({ ...prev, isOpen: false }))}
        reserva={sidebarState.data}
        isCreating={sidebarState.mode === "create"}
        selectedDate={selectedDate}
        preSelectedCanchaId={sidebarState.preSelectedCanchaId}
        preSelectedTime={sidebarState.preSelectedTime}
      />
    </div>
  );
}
