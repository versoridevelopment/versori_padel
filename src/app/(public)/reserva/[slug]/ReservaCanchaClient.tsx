"use client";

import Image from "next/image";
import { useEffect, useState, CSSProperties } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  ArrowLeft,
  Loader2,
} from "lucide-react";
// (Opcional) Si no usas supabase aquí para nada más, podrías quitar este import,
// pero lo dejo por si lo usas en otra parte del componente no mostrada.
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Club } from "@/lib/ObetenerClubUtils/getClubBySubdomain";

import SingleCourtAgenda from "./SingleCourtAgenda";
import { useReservaCanchaLogic, type CanchaUI } from "./useReservaCancha";

const CONFIRMATION_URL = "/reserva/confirmacion";

export default function ReservaCanchaClient({
  club,
  cancha,
}: {
  club: Club;
  cancha: CanchaUI;
}) {
  const router = useRouter();
  // const supabase = createClientComponentClient(); // Ya no bloqueamos con esto

  // Estados de carga
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Reset de estados al navegar
  useEffect(() => {
    setIsNavigating(false);
    setIsCheckingAuth(false);
  }, [pathname, searchParams]);

  const {
    availableDays,
    openDateISO,
    openDayLabel,
    openDay,
    showDays,
    setShowDays,
    segmentoActual,
    fechaTexto,
    anchorAbs,
    selectedAbs,
    validEndAbsSet,
    warning,
    handleSelect,
    hasAnySelection,
    durationMinutes,
    durationOk,
    startTime,
    endTime,
    requestFecha,
    priceLoading,
    pricePreview,
    etiquetaTarifa,
    canConfirm,
    selectDay,
  } = useReservaCanchaLogic({ club, cancha });

  const customStyle = {
    "--primary": club.color_primario || "#3b82f6",
    "--secondary": club.color_secundario || "#1e40af",
    "--text-club": club.color_texto || "#ffffff",
  } as CSSProperties;

  // --- LÓGICA DIRECTA (SIN BLOQUEO DE AUTH) ---
  const handleConfirmarReserva = async () => {
    if (!canConfirm || !startTime || !endTime) return;

    setIsCheckingAuth(true);

    try {
      // 1. Guardar Intención (Draft)
      // Esto guarda los datos de la reserva en una cookie/db temporal
      const res = await fetch("/api/reservas/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_club: club.id_club,
          id_cancha: cancha.id_cancha,
          fecha: requestFecha,
          inicio: startTime,
          fin: endTime,
        }),
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setIsCheckingAuth(false);
        alert(
          data?.error || "No se pudo preparar la reserva. Intente nuevamente.",
        );
        return;
      }

      // 2. Redirección DIRECTA a Confirmación
      // Ya no verificamos sesión aquí. Dejamos que la página de destino (/confirmacion)
      // o el middleware decidan qué hacer si el usuario no está logueado.
      router.push(CONFIRMATION_URL);
    } catch (error) {
      setIsCheckingAuth(false);
      console.error("Error en flujo de reserva:", error);
      alert("Ocurrió un error de conexión.");
    }
  };

  return (
    <section
      style={customStyle}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[var(--primary)]/40 flex flex-col items-center text-white px-3 pt-24 pb-10 sm:px-6 sm:pt-36 sm:pb-12 relative selection:bg-[var(--primary)] selection:text-white font-sans"
    >
      {/* Overlay de Carga */}
      {(isNavigating || (isCheckingAuth && !hasAnySelection)) && (
        <div className="fixed inset-0 z-[100] bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-300">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--primary)] blur-xl opacity-20 rounded-full animate-pulse" />
              <Loader2 className="w-16 h-16 text-[var(--primary)] animate-spin relative z-10" />
            </div>
            <p className="text-white font-medium text-lg tracking-wide animate-pulse">
              Procesando reserva...
            </p>
          </div>
        </div>
      )}

      {/* Botón Volver */}
      <button
        onClick={() => {
          setIsNavigating(true);
          router.back();
        }}
        className="absolute top-20 left-4 sm:top-28 z-20 flex items-center justify-center p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300 group shadow-lg"
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* Hero Section */}
      <div className="w-full max-w-5xl relative z-10 mb-8 group">
        <div className="relative w-full h-56 sm:h-72 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 transition-transform duration-500 hover:scale-[1.01]">
          <Image
            src={cancha.imagen}
            alt={cancha.nombre}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

          <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 rounded-full bg-[var(--primary)] text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-[var(--primary)]/40 border border-[var(--primary)]/50">
                {club.nombre}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold border border-white/20 uppercase tracking-widest text-neutral-200">
                {segmentoActual === "profe" ? "Profesor" : "Público"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-lg">
              {cancha.nombre}
            </h1>
            <p className="text-neutral-300 text-sm sm:text-base line-clamp-1 opacity-90 max-w-2xl font-medium">
              {cancha.descripcion}
            </p>
          </div>
        </div>
      </div>

      {/* Panel Principal */}
      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 sm:p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[var(--primary)] rounded-full blur-[120px] opacity-10 pointer-events-none" />

        {/* Selector de Fecha */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 relative z-10">
          <button
            onClick={() => setShowDays((p) => !p)}
            className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group w-full sm:w-auto justify-between sm:justify-start active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--primary)]/20 rounded-lg text-[var(--primary)]">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                  Fecha Seleccionada
                </span>
                <span className="text-base font-bold capitalize text-white flex items-center gap-2">
                  {openDayLabel}
                  <span className="opacity-40 font-medium text-sm border-l border-white/20 pl-2">
                    {fechaTexto}
                  </span>
                </span>
              </div>
            </div>
            <motion.span
              animate={{ rotate: showDays ? 180 : 0 }}
              className="text-neutral-500 group-hover:text-white transition-colors"
            >
              ▼
            </motion.span>
          </button>

          {/* Leyenda */}
          <div className="flex gap-4 text-xs font-medium text-neutral-400 bg-black/20 p-2 rounded-full border border-white/5 px-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"></div>
              Tu Selección
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
              Disponible
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center">
                <Lock className="w-1.5 h-1.5 opacity-50" />
              </div>
              Ocupado
            </div>
          </div>
        </div>

        {/* Selector de días expandible */}
        <AnimatePresence>
          {showDays && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {availableDays.map((d) => (
                  <button
                    key={d.dateISO}
                    onClick={() => selectDay(d)}
                    className={`
                      px-5 py-3 rounded-xl border text-sm font-bold transition-all flex-1 sm:flex-none text-center min-w-[90px]
                      ${
                        openDateISO === d.dateISO
                          ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20 scale-105"
                          : "bg-white/5 border-white/5 hover:bg-white/10 text-neutral-400 hover:text-white hover:border-white/20"
                      }
                    `}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grilla de Horarios */}
        <div className="min-h-[300px] relative">
          {!openDay ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin opacity-50" />
              <span className="text-sm font-medium">
                Cargando disponibilidad...
              </span>
            </div>
          ) : openDay.slots.length === 0 ? (
            <div className="p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 flex flex-col items-center gap-4">
              <div className="p-4 bg-white/5 rounded-full">
                <Lock className="w-8 h-8 text-neutral-500" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">
                  Sin turnos disponibles
                </p>
                <p className="text-neutral-400 text-sm mt-1">
                  Intenta seleccionando otra fecha.
                </p>
              </div>
            </div>
          ) : (
            <SingleCourtAgenda
              slots={openDay.slots}
              canchaNombre={cancha.nombre}
              selectedAbs={selectedAbs}
              anchorAbs={anchorAbs}
              validEndAbsSet={validEndAbsSet}
              onSelect={handleSelect}
              primaryCssVar={"var(--primary)"}
            />
          )}
        </div>

        {/* Footer Flotante / Resumen */}
        <div className="mt-8 space-y-4">
          <AnimatePresence>
            {warning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-amber-500/10 border border-amber-500/20 text-amber-200 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium"
              >
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                {warning}
              </motion.div>
            )}
          </AnimatePresence>

          {hasAnySelection && durationOk && startTime && endTime && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/10 to-transparent pointer-events-none" />

              <div className="flex items-center gap-5 relative z-10 w-full sm:w-auto">
                <div className="p-3.5 bg-[var(--primary)] rounded-xl shadow-lg shadow-[var(--primary)]/30 text-white">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-neutral-400 text-[10px] uppercase font-bold tracking-widest mb-1">
                    Horario Seleccionado
                  </p>
                  <div className="text-white font-bold text-lg sm:text-xl flex gap-3 items-center">
                    <span>
                      {startTime} - {endTime}
                    </span>
                    <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                    <span className="text-neutral-300 font-medium text-base">
                      {durationMinutes} min
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-12 w-px bg-white/10 hidden sm:block" />

              <div className="text-right flex flex-col items-end relative z-10 w-full sm:w-auto">
                {priceLoading ? (
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Cotizando...</span>
                  </div>
                ) : pricePreview?.ok ? (
                  <>
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                      ${pricePreview.precio_total.toLocaleString("es-AR")}
                    </p>
                    {etiquetaTarifa && (
                      <span className="text-[10px] text-[var(--primary)] font-bold bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20 uppercase tracking-wide mt-1">
                        {etiquetaTarifa}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-rose-400 text-sm font-bold bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">
                    Tarifa no disponible
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* BOTÓN DE CONFIRMACIÓN */}
          <button
            disabled={!canConfirm || isCheckingAuth}
            onClick={handleConfirmarReserva}
            className={`
              w-full py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl shadow-xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group
              ${
                canConfirm
                  ? "bg-[var(--primary)] text-white shadow-[var(--primary)]/40 hover:shadow-[var(--primary)]/60 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99]"
                  : "bg-white/5 text-neutral-500 cursor-not-allowed border border-white/5"
              }
            `}
          >
            {isCheckingAuth ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">Confirmar Reserva</span>
                <CheckCircle2 className="w-6 h-6 relative z-10 group-hover:scale-110 transition-transform" />
                {canConfirm && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
