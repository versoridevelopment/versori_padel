"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface Props {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

// ✅ ISO local (sin UTC) para input type="date"
function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DateSelector({ selectedDate, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m, d] = e.target.value.split("-").map(Number);
    onChange(new Date(y, m - 1, d)); // medianoche local
    setIsOpen(false);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  };

  return (
    <div
      className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm relative"
      ref={containerRef}
    >
      <button
        onClick={() => shiftDate(-1)}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Botón Central que abre el calendario */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 text-center min-w-[140px] cursor-pointer hover:bg-gray-50 rounded-lg py-1 transition-colors group select-none"
      >
        <span className="block text-xs font-bold text-blue-600 uppercase tracking-wider group-hover:text-blue-700">
          {selectedDate.toLocaleDateString("es-AR", { weekday: "long" })}
        </span>

        <div className="flex items-center justify-center gap-1.5 text-gray-800">
          <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
          <span className="block text-base font-bold">
            {selectedDate.toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
      </div>

      <button
        onClick={() => shiftDate(1)}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Mini Calendario Flotante */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white p-4 rounded-xl shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-200">
          <label className="block text-xs font-bold text-gray-500 mb-2">
            Seleccionar fecha
          </label>
          <input
            type="date"
            value={toISODateLocal(selectedDate)}
            onChange={handleDateChange}
            className="w-full p-2 border border-gray-200 rounded-lg text-sm"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
