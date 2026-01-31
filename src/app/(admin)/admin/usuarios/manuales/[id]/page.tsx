"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  DollarSign,
  Trophy,
  Clock,
  MapPin,
  Edit2,
  X,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";

// --- HELPER: Normalizar Teléfono (Misma lógica que en crear) ---
const normalizePhone = (input: string) => {
  if (!input) return "";
  let clean = input.replace(/\D/g, "");
  if (clean.startsWith("549")) clean = clean.slice(3);
  else if (clean.startsWith("54")) clean = clean.slice(2);
  if (clean.startsWith("0")) clean = clean.slice(1);
  return clean;
};

// --- TIPOS ---
type ReservaHistorial = {
  id_reserva: number;
  fecha: string;
  inicio: string;
  fin: string;
  precio_total: number;
  estado: string;
  canchas: { nombre: string };
  notas: string | null;
  created_at: string;
};

type PerfilManual = {
  nombre: string;
  telefono: string;
  email: string;
  total_reservas: number;
  total_gastado: number;
};

export default function DetalleUsuarioManualPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const clienteNombre = decodeURIComponent(id);

  const [perfil, setPerfil] = useState<PerfilManual | null>(null);
  const [historial, setHistorial] = useState<ReservaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [idClub, setIdClub] = useState<number | null>(null);

  // Estados para Edición
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ telefono: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  // 1. Obtener Club ID
  useEffect(() => {
    const getClub = async () => {
      if (typeof window === "undefined") return;
      const hostname = window.location.hostname;
      const subdomain = hostname.split(".")[0];
      if (subdomain && subdomain !== "localhost") {
        const { data } = await supabase
          .from("clubes")
          .select("id_club")
          .eq("subdominio", subdomain)
          .single();
        if (data) setIdClub(data.id_club);
      } else {
        setIdClub(9); // Fallback dev
      }
    };
    getClub();
  }, [supabase]);

  // 2. Cargar Datos (Función reutilizable para recargar tras editar)
  const loadData = async () => {
    if (!idClub || !clienteNombre) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/usuarios/manuales/${encodeURIComponent(clienteNombre)}?id_club=${idClub}`,
      );
      const json = await res.json();
      if (json.ok) {
        setPerfil(json.perfil);
        setHistorial(json.historial);
        // Inicializar form
        setEditForm({
          telefono: json.perfil.telefono || "",
          email: json.perfil.email || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idClub, clienteNombre]);

  // 3. Manejar Apertura del Modal
  const handleOpenEdit = () => {
    if (perfil) {
      setEditForm({ telefono: perfil.telefono, email: perfil.email });
      setErrorMsg(null);
      setIsEditOpen(true);
    }
  };

  // 4. Guardar con Validación de Duplicados
  const handleSaveEdit = async () => {
    if (!perfil || !idClub) return;
    setSaving(true);
    setErrorMsg(null);

    const cleanNewPhone = normalizePhone(editForm.telefono);
    const cleanOldPhone = normalizePhone(perfil.telefono);

    try {
      // A. VALIDACIÓN: Si cambió el teléfono, verificar que no exista
      if (cleanNewPhone && cleanNewPhone !== cleanOldPhone) {
        // Buscamos si existe alguien con ese número
        const checkRes = await fetch(
          `/api/admin/clientes/search?q=${cleanNewPhone}&id_club=${idClub}&type=manual`,
        );
        const checkJson = await checkRes.json();
        const results = checkJson.results || [];

        // Si encontramos resultados, verificamos que no sea él mismo (aunque por nombre diferente debería saltar)
        // La API de search busca coincidencias. Si encuentra una coincidencia exacta de teléfono con OTRO nombre:
        const duplicate = results.find(
          (r: any) =>
            normalizePhone(r.telefono) === cleanNewPhone &&
            r.nombre.toLowerCase() !== perfil.nombre.toLowerCase(),
        );

        if (duplicate) {
          setErrorMsg(
            `El número ${cleanNewPhone} ya pertenece al usuario "${duplicate.nombre}". No se pueden duplicar teléfonos.`,
          );
          setSaving(false);
          return;
        }
      }

      // B. GUARDAR: Si pasó la validación, procedemos
      const res = await fetch("/api/admin/usuarios/manuales/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldNombre: perfil.nombre,
          id_club: idClub,
          newTelefono: cleanNewPhone, // Guardamos el limpio
          newEmail: editForm.email,
        }),
      });

      if (res.ok) {
        setIsEditOpen(false);
        loadData(); // Recargar la vista para ver cambios
      } else {
        setErrorMsg("Ocurrió un error al guardar los cambios.");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Error de conexión al servidor.");
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(val);

  if (loading && !perfil) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (!perfil)
    return <div className="p-10 text-center">Usuario no encontrado</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans space-y-8">
      {/* NAV */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a lista
      </button>

      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center relative overflow-hidden">
        <div className="flex items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 flex items-center justify-center font-black text-2xl shadow-sm border border-orange-100">
            {perfil.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {perfil.nombre}
              </h1>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                Manual
              </span>

              {/* BOTÓN EDITAR */}
              <button
                onClick={handleOpenEdit}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                title="Editar contacto"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                {perfil.telefono || (
                  <span className="italic text-slate-300">Sin teléfono</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                {perfil.email || (
                  <span className="italic text-slate-300">Sin email</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="flex gap-3 w-full md:w-auto z-10">
          <div className="flex-1 md:flex-none bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[140px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Turnos
            </span>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-black text-slate-800">
                {perfil.total_reservas}
              </span>
            </div>
          </div>
          <div className="flex-1 md:flex-none bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[160px]">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Inversión
            </span>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-black text-slate-800">
                {formatMoney(perfil.total_gastado)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIAL TABLE */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" /> Historial de Actividad
        </h2>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Horario
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Cancha
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.map((r) => (
                  <tr
                    key={r.id_reserva}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">
                          {new Date(r.fecha + "T12:00:00").toLocaleDateString(
                            "es-AR",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </span>
                        <span
                          className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"
                          title="Fecha de creación"
                        >
                          <Clock className="w-3 h-3" /> Creado:{" "}
                          {new Date(r.created_at).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {r.inicio.slice(0, 5)} - {r.fin.slice(0, 5)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">
                          {r.canchas?.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          r.estado === "confirmada"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : r.estado === "pendiente_pago"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {r.estado.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-slate-600">
                      {formatMoney(r.precio_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-500" /> Editar Datos
                </h3>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Nombre Read-Only */}
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-white text-orange-500 flex items-center justify-center shadow-sm font-bold">
                    {perfil.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">
                      Usuario
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {perfil.nombre}
                    </p>
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={editForm.telefono}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setEditForm({ ...editForm, telefono: e.target.value });
                      }}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Ej: 3794123456"
                    />
                    <p className="text-[10px] text-slate-400 ml-1">
                      Se verificará que no esté duplicado.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="cliente@ejemplo.com"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {errorMsg && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-lg shadow-slate-900/10 flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
