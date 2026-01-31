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
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";

// --- HELPER: Normalizar Teléfono ---
const normalizePhone = (input: string) => {
  if (!input) return "";
  let clean = input.replace(/\D/g, "");
  if (clean.startsWith("549")) clean = clean.slice(3);
  else if (clean.startsWith("54")) clean = clean.slice(2);
  if (clean.startsWith("0")) clean = clean.slice(1);
  return clean;
};

// --- COMPONENTE: BADGE DE ESTADO ---
const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    confirmada: "bg-green-100 text-green-700 border-green-200",
    pendiente_pago: "bg-yellow-50 text-yellow-700 border-yellow-200",
    cancelada: "bg-red-50 text-red-700 border-red-200",
    finalizada: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const icons: any = {
    confirmada: <CheckCircle2 className="w-3 h-3" />,
    pendiente_pago: <AlertTriangle className="w-3 h-3" />,
    cancelada: <XCircle className="w-3 h-3" />,
    finalizada: <CheckCircle2 className="w-3 h-3" />,
  };

  const s = status.toLowerCase();
  const style = styles[s] || styles.finalizada;
  const icon = icons[s] || null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${style}`}
    >
      {icon} {s.replace("_", " ")}
    </span>
  );
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

  // Estados Edición
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

  // 1. Init
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
        setIdClub(9);
      }
    };
    getClub();
  }, [supabase]);

  // 2. Load Data
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
  }, [idClub, clienteNombre]);

  // 3. Actions
  const handleOpenEdit = () => {
    if (perfil) {
      setEditForm({ telefono: perfil.telefono, email: perfil.email });
      setErrorMsg(null);
      setIsEditOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!perfil || !idClub) return;
    setSaving(true);
    setErrorMsg(null);

    const cleanNewPhone = normalizePhone(editForm.telefono);
    const cleanOldPhone = normalizePhone(perfil.telefono);

    try {
      // Validación duplicados
      if (cleanNewPhone && cleanNewPhone !== cleanOldPhone) {
        const checkRes = await fetch(
          `/api/admin/clientes/search?q=${cleanNewPhone}&id_club=${idClub}&type=manual`,
        );
        const checkJson = await checkRes.json();
        const results = checkJson.results || [];
        const duplicate = results.find(
          (r: any) =>
            normalizePhone(r.telefono) === cleanNewPhone &&
            r.nombre.toLowerCase() !== perfil.nombre.toLowerCase(),
        );

        if (duplicate) {
          setErrorMsg(`El número ya pertenece a "${duplicate.nombre}".`);
          setSaving(false);
          return;
        }
      }

      const res = await fetch("/api/admin/usuarios/manuales/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldNombre: perfil.nombre,
          id_club: idClub,
          newTelefono: cleanNewPhone,
          newEmail: editForm.email,
        }),
      });

      if (res.ok) {
        setIsEditOpen(false);
        loadData();
      } else {
        setErrorMsg("Error al guardar.");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Error de conexión.");
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
        <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
      </div>
    );
  }

  if (!perfil)
    return <div className="p-10 text-center">Usuario no encontrado</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 active:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Detalle de Usuario
        </h1>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* --- TARJETA DE PERFIL --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row gap-5 items-center md:items-start text-center md:text-left">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-md shrink-0">
              {perfil.nombre.charAt(0).toUpperCase()}
            </div>

            {/* Info Principal */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">
                  {perfil.nombre}
                </h2>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                  Manual
                </span>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3 md:mt-1">
                {perfil.telefono ? (
                  <a
                    href={`tel:${perfil.telefono}`}
                    className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 hover:border-blue-200 hover:text-blue-600 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> {perfil.telefono}
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-slate-400 italic">
                    <Phone className="w-3.5 h-3.5" /> Sin teléfono
                  </span>
                )}

                {perfil.email ? (
                  <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    <Mail className="w-3.5 h-3.5" /> {perfil.email}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-slate-400 italic">
                    <Mail className="w-3.5 h-3.5" /> Sin email
                  </span>
                )}
              </div>
            </div>

            {/* Botón Editar */}
            <button
              onClick={handleOpenEdit}
              className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200 transition-all active:scale-95"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- ESTADÍSTICAS (GRID) --- */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Turnos
            </span>
            <div className="flex items-center gap-2 text-blue-600">
              <Trophy className="w-5 h-5" />
              <span className="text-2xl font-black">
                {perfil.total_reservas}
              </span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Inversión
            </span>
            <div className="flex items-center gap-2 text-green-600">
              <DollarSign className="w-5 h-5" />
              <span className="text-xl font-black">
                {formatMoney(perfil.total_gastado)}
              </span>
            </div>
          </div>
        </div>

        {/* --- HISTORIAL DE RESERVAS --- */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-slate-400" /> Historial
          </h3>

          {/* LISTA VACÍA */}
          {historial.length === 0 && (
            <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
              Sin reservas registradas.
            </div>
          )}

          {/* VISTA MÓVIL: TARJETAS */}
          <div className="flex flex-col gap-3 md:hidden">
            {historial.map((r) => (
              <div
                key={r.id_reserva}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(r.fecha + "T12:00:00").toLocaleDateString(
                        "es-AR",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      {r.inicio.slice(0, 5)} - {r.fin.slice(0, 5)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">
                      {formatMoney(r.precio_total)}
                    </p>
                    <div className="mt-1 flex justify-end">
                      <StatusBadge status={r.estado} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 px-2 py-1 rounded-lg">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {r.canchas?.nombre}
                  </div>
                  <span className="text-[10px] text-slate-300">
                    Creado: {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* VISTA ESCRITORIO: TABLA (Oculta en móvil) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                    Horario
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                    Cancha
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.map((r) => (
                  <tr
                    key={r.id_reserva}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {new Date(r.fecha + "T12:00:00").toLocaleDateString(
                        "es-AR",
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      {r.inicio.slice(0, 5)} - {r.fin.slice(0, 5)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {r.canchas?.nombre}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.estado} />
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

      {/* MODAL DE EDICIÓN RESPONSIVO */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-500" /> Editar Datos
                </h3>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 -mr-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Nombre Read-Only */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-sm font-bold text-lg">
                    {perfil.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                      Usuario
                    </p>
                    <p className="text-base font-bold text-slate-800">
                      {perfil.nombre}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={editForm.telefono}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setEditForm({ ...editForm, telefono: e.target.value });
                      }}
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      placeholder="Ej: 3794123456"
                    />
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
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      placeholder="cliente@ejemplo.com"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 pb-8 md:pb-4">
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors bg-white border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 py-3.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
