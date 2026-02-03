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
  StickyNote,
  UserCog,
  History,
  MessageCircle,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";

// HELPERS
const normalizePhone = (input: string) => {
  if (!input) return "";
  let clean = input.replace(/\D/g, "");
  if (clean.startsWith("549")) clean = clean.slice(3);
  else if (clean.startsWith("54")) clean = clean.slice(2);
  if (clean.startsWith("0")) clean = clean.slice(1);
  return clean;
};

const getWhatsappLink = (phone: string) => {
  const clean = normalizePhone(phone);
  return clean ? `https://wa.me/549${clean}` : "#";
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pendiente_pago: "bg-amber-50 text-amber-700 border-amber-200",
    cancelada: "bg-rose-50 text-rose-700 border-rose-200",
    rechazada: "bg-rose-50 text-rose-700 border-rose-200",
    finalizada: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const icons: any = {
    confirmada: <CheckCircle2 className="w-3 h-3" />,
    pendiente_pago: <AlertTriangle className="w-3 h-3" />,
    cancelada: <XCircle className="w-3 h-3" />,
    rechazada: <XCircle className="w-3 h-3" />,
    finalizada: <CheckCircle2 className="w-3 h-3" />,
  };
  const s = status.toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${styles[s] || styles.finalizada}`}
    >
      {icons[s]} {s.replace("_", " ")}
    </span>
  );
};

// TIPOS COINCIDENTES CON BACKEND
type ReservaHistorial = {
  id_reserva: number;
  fecha: string;
  inicio: string;
  fin: string;
  precio_total: number;
  estado: string;
  canchas: { nombre: string };
  notas: string | null;
  audit_accion: string;
  audit_fecha: string;
  audit_responsable: string;
};

type PerfilManual = {
  nombre: string;
  telefono: string;
  email: string;
  total_reservas: number;
  total_gastado: number;
  notas?: string;
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

  // Estados UI
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ telefono: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  useEffect(() => {
    const getClub = async () => {
      const { data } = await supabase
        .from("clubes")
        .select("id_club")
        .eq("subdominio", window.location.hostname.split(".")[0])
        .maybeSingle();
      setIdClub(data?.id_club || 9);
    };
    getClub();
  }, [supabase]);

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
          telefono: json.perfil.telefono,
          email: json.perfil.email,
        });
        setNoteText(json.perfil.notas || "");
      } else {
        console.error("Backend error:", json.error);
        setPerfil(null);
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

  const handleSaveEdit = async () => {
    setSaving(true);
    const cleanNewPhone = normalizePhone(editForm.telefono);
    try {
      const res = await fetch("/api/admin/usuarios/manuales/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldNombre: perfil?.nombre,
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
    } catch {
      setErrorMsg("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const identificador = perfil?.telefono
        ? perfil.telefono
        : perfil?.nombre.toLowerCase();
      const res = await fetch("/api/admin/usuarios/manuales/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_club: idClub,
          identificador,
          notas: noteText,
        }),
      });
      if (res.ok) {
        setPerfil((prev) => (prev ? { ...prev, notas: noteText } : null));
        setIsNoteModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
    }
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(val);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  if (!perfil)
    return (
      <div className="p-10 text-center text-slate-500">
        Usuario no encontrado o sin historial.
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 active:bg-slate-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Perfil de Cliente
        </h1>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative">
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
              <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-3xl shadow-md">
                {perfil.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-slate-900 truncate">
                  {perfil.nombre}
                </h2>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                  <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-full border">
                    <Phone className="w-3.5 h-3.5" />{" "}
                    {perfil.telefono || "Sin Teléfono"}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-full border">
                    <Mail className="w-3.5 h-3.5" />{" "}
                    {perfil.email || "Sin Email"}
                  </span>
                </div>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                {perfil.telefono && (
                  <a
                    href={getWhatsappLink(perfil.telefono)}
                    target="_blank"
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 hover:scale-105 transition-transform"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-200"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            onClick={() => setIsNoteModalOpen(true)}
            className="bg-amber-50 rounded-2xl border border-amber-100 p-5 cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
                <StickyNote className="w-4 h-4" /> Notas Internas
              </h3>
              <Edit2 className="w-3 h-3 text-amber-400 group-hover:text-amber-600" />
            </div>
            <p
              className={`text-sm ${perfil.notas ? "text-amber-900" : "text-amber-800/50 italic"}`}
            >
              {perfil.notas || "Agregar observaciones..."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Turnos Totales
            </span>
            <div className="flex items-center gap-2 text-blue-600">
              <Trophy className="w-6 h-6" />
              <span className="text-3xl font-black">
                {perfil.total_reservas}
              </span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Inversión Histórica
            </span>
            <div className="flex items-center gap-2 text-emerald-600">
              <DollarSign className="w-6 h-6" />
              <span className="text-3xl font-black">
                {formatMoney(perfil.total_gastado)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-slate-400" /> Historial y Auditoría
          </h3>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                    Detalle
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                    Gestión / Auditoría
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.map((r) => {
                  const fecha = new Date(r.audit_fecha);
                  const isCancel = r.audit_accion === "Cancelado";
                  return (
                    <tr
                      key={r.id_reserva}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-700 text-sm">
                          {new Date(r.fecha + "T12:00:00").toLocaleDateString(
                            "es-AR",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {r.canchas?.nombre} •{" "}
                          {r.inicio.slice(0, 5)} hs
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.estado} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div
                            className={`flex items-center gap-1.5 text-xs font-bold uppercase ${isCancel ? "text-rose-600" : "text-blue-600"}`}
                          >
                            <UserCog className="w-3.5 h-3.5" />{" "}
                            {r.audit_responsable}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 italic">
                            <Clock className="w-3 h-3" /> {r.audit_accion}:{" "}
                            {fecha.toLocaleDateString()}{" "}
                            {fecha.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-slate-700 text-sm">
                          {formatMoney(r.precio_total)}
                        </p>
                        <p className="text-[9px] text-slate-400 uppercase">
                          ID: #{r.id_reserva}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modales sin cambios importantes */}
      <AnimatePresence>
        {isEditOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsEditOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg mb-4">Editar Perfil</h3>
              <div className="space-y-4">
                <input
                  type="tel"
                  value={editForm.telefono}
                  onChange={(e) =>
                    setEditForm({ ...editForm, telefono: e.target.value })
                  }
                  className="w-full p-3 border rounded-xl"
                  placeholder="Teléfono"
                />
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full p-3 border rounded-xl"
                  placeholder="Email"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 py-3 border rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold flex justify-center items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}{" "}
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNoteModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsNoteModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-amber-50 border-b border-amber-100 font-bold flex items-center gap-2 text-amber-800">
                <StickyNote className="w-5 h-5" /> Notas Internas
              </div>
              <div className="p-6">
                <textarea
                  className="w-full h-32 p-3 border rounded-xl bg-amber-50/10 outline-none"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Escribe observaciones..."
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setIsNoteModalOpen(false)}
                    className="px-4 py-2 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
