"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Trophy,
  Edit2,
  Trash2,
  Power,
  ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle, // Icono para pausa/mantenimiento
  RefreshCcw, // Icono para restaurar
} from "lucide-react";

// --- TIPOS ---
type ApiError = { error: string };

type Cancha = {
  id_cancha: number;
  id_club: number;
  nombre: string;
  descripcion: string | null;
  precio_hora: number;
  imagen_url: string | null;
  es_exterior: boolean;
  activa: boolean; // TRUE = Operativa, FALSE = Mantenimiento
  estado: boolean; // TRUE = Existe, FALSE = Eliminada (Baja lógica)
  tipo_nombre?: string;
  deporte_nombre?: string;
};

// --- COMPONENTES AUXILIARES ---

function StatusBadge({ activa, estado }: { activa: boolean; estado: boolean }) {
  // CASO 1: BAJA LÓGICA (ELIMINADA)
  if (!estado) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200">
        <Trash2 className="w-3.5 h-3.5" /> Eliminada
      </div>
    );
  }

  // CASO 2: INACTIVA / MANTENIMIENTO
  if (!activa) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
        <PauseCircle className="w-3.5 h-3.5" /> Mantenimiento
      </div>
    );
  }

  // CASO 3: ACTIVA / OPERATIVA
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
      <CheckCircle2 className="w-3.5 h-3.5" /> Disponible
    </div>
  );
}

function CanchaImage({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0">
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes="80px" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-300">
          <ImageIcon className="w-8 h-8" />
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---

export default function CanchasClient({
  clubId,
  clubNombre,
}: {
  clubId: number;
  clubNombre: string;
}) {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showDeleted, setShowDeleted] = useState(false); // Cambié el nombre para ser más claro (Deleted vs Inactive)
  const [error, setError] = useState<string | null>(null);

  // --- DATA FETCHING ---
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/canchas?id_club=${clubId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(e?.error || "Error al cargar canchas");
      }
      const data = (await res.json()) as Cancha[];
      setCanchas(data);
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // --- FILTRADO ---
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return canchas
      .filter((c) => {
        // Si showDeleted es false, SOLO mostramos las que tienen estado === true.
        // Si showDeleted es true, mostramos TODAS.
        if (!showDeleted && c.estado === false) return false;
        return true;
      })
      .filter((c) => {
        if (!term) return true;
        return (
          c.nombre.toLowerCase().includes(term) ||
          (c.descripcion ?? "").toLowerCase().includes(term) ||
          String(c.precio_hora).includes(term)
        );
      });
  }, [canchas, q, showDeleted]);

  // --- ACTIONS ---

  // Acción 1: Toggle Operativa (Activa/Mantenimiento)
  async function toggleOperativa(id_cancha: number, estadoActual: boolean) {
    const nuevoEstado = !estadoActual;

    // UI Optimista
    const prevCanchas = [...canchas];
    setCanchas((prev) =>
      prev.map((c) =>
        c.id_cancha === id_cancha ? { ...c, activa: nuevoEstado } : c
      )
    );

    try {
      const res = await fetch(`/api/admin/canchas/${id_cancha}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: nuevoEstado }), // Enviamos 'activa'
      });
      if (!res.ok) throw new Error("Error al actualizar");
    } catch (error) {
      setCanchas(prevCanchas); // Revertir
      alert("No se pudo cambiar el estado operativo.");
    }
  }

  // Acción 2: Baja/Alta Lógica (Estado)
  async function toggleBajaLogica(id_cancha: number, darDeBaja: boolean) {
    if (darDeBaja && !confirm("¿Seguro que deseas eliminar esta cancha?"))
      return;

    const prevCanchas = [...canchas];
    // UI Optimista
    setCanchas((prev) =>
      prev.map((c) =>
        c.id_cancha === id_cancha ? { ...c, estado: !darDeBaja } : c
      )
    );

    try {
      // Si damos de baja, usamos DELETE, si restauramos usamos PATCH
      let res;
      if (darDeBaja) {
        res = await fetch(`/api/admin/canchas/${id_cancha}`, {
          method: "DELETE",
        });
      } else {
        res = await fetch(`/api/admin/canchas/${id_cancha}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: true }),
        });
      }

      if (!res.ok) throw new Error("Error en la operación");
    } catch (err: any) {
      setCanchas(prevCanchas);
      alert("Error al actualizar estado.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 -m-6 md:-m-10">
      <div className="max-w-[1200px] mx-auto space-y-8 pb-32">
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              Administrar Canchas
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Gestiona los espacios deportivos de{" "}
              <span className="font-semibold text-slate-700">{clubNombre}</span>
              .
            </p>
          </div>
          <Link
            href="/admin/personalizacion/canchas/nueva"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:-translate-y-1 transition-all"
          >
            <Plus className="w-5 h-5" /> Nueva Cancha
          </Link>
        </div>

        {/* --- TOOLBAR --- */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Buscador */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, precio..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors select-none">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                Ver Eliminadas
              </span>
            </label>
            <button
              onClick={load}
              className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              title="Recargar lista"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Filter className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* --- LISTADO --- */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-slate-500">Cargando canchas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">
                No se encontraron canchas
              </h3>
              <p className="text-slate-500 text-sm">
                Prueba ajustando los filtros o agrega una nueva.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((c) => (
                <div
                  key={c.id_cancha}
                  className={`bg-white p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-5 group ${
                    c.estado
                      ? c.activa
                        ? "border-slate-200 shadow-sm hover:shadow-md"
                        : "border-amber-200 bg-amber-50/30"
                      : "border-slate-100 bg-slate-50 opacity-70"
                  }`}
                >
                  {/* Imagen */}
                  <CanchaImage src={c.imagen_url} alt={c.nombre} />

                  {/* Info Principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3
                        className={`text-lg font-bold truncate ${
                          c.estado
                            ? "text-slate-900"
                            : "text-slate-500 line-through"
                        }`}
                      >
                        {c.nombre}
                      </h3>
                      {/* Aquí usamos el estado COMPLETO para el badge */}
                      <StatusBadge activa={c.activa} estado={c.estado} />
                    </div>

                    <p className="text-sm text-slate-500 line-clamp-1 mb-2">
                      {c.descripcion || "Sin descripción"}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                        {c.es_exterior ? "Exterior" : "Techada"}
                      </span>
                    </div>
                  </div>

                  {/* Precio y Acciones */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:pl-6 sm:border-l border-slate-100 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-0.5">
                        Precio Hora
                      </p>
                      <p className="text-xl font-black text-slate-900">
                        ${Number(c.precio_hora).toLocaleString("es-AR")}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {/* Solo mostrar acciones si no está eliminada, o solo el restaurar si lo está */}
                      {c.estado ? (
                        <>
                          {/* 1. Toggle Mantenimiento/Activa */}
                          <button
                            onClick={() =>
                              toggleOperativa(c.id_cancha, c.activa)
                            }
                            className={`p-2.5 rounded-xl transition-colors ${
                              c.activa
                                ? "bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700"
                                : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                            }`}
                            title={
                              c.activa ? "Pausar (Mantenimiento)" : "Habilitar"
                            }
                          >
                            {c.activa ? (
                              <PauseCircle className="w-5 h-5" />
                            ) : (
                              <Power className="w-5 h-5" />
                            )}
                          </button>

                          {/* 2. Editar */}
                          <Link
                            href={`/admin/personalizacion/canchas/${c.id_cancha}`}
                            className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Editar Cancha"
                          >
                            <Edit2 className="w-5 h-5" />
                          </Link>

                          {/* 3. Eliminar (Baja Lógica) */}
                          <button
                            onClick={() => toggleBajaLogica(c.id_cancha, true)}
                            className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Eliminar (Baja)"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        // Acción para cancha eliminada: Restaurar
                        <button
                          onClick={() => toggleBajaLogica(c.id_cancha, false)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors"
                          title="Restaurar Cancha"
                        >
                          <RefreshCcw className="w-4 h-4" /> Restaurar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
