"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Ban,
  ChevronLeft,
  DollarSign,
  Trophy,
  History,
  MapPin,
  AlertCircle,
  Activity,
  CreditCard,
  Loader2,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- TIPOS (Mismos de antes) ---
type ReservaRaw = {
  id_reserva: number;
  fecha: string;
  inicio: string;
  fin: string;
  precio_total: number;
  estado: string;
  canchas: {
    nombre: string;
    tipos_cancha: {
      nombre: string;
      deportes: { nombre: string };
    };
  };
};

type UserProfile = {
  id_usuario: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  apodo?: string | null;
  bio?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  roles: string[];
  reservas: ReservaRaw[];
  bloqueado?: boolean;
};

// --- COMPONENTES AUXILIARES (Iguales) ---
function InfoItem({ icon: Icon, label, value, isLink }: any) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
      <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 shadow-sm shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        {isLink && value ? (
          <a
            href={
              label === "Email"
                ? `mailto:${value}`
                : `https://wa.me/${value?.replace(/\D/g, "")}`
            }
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-blue-600 hover:underline truncate block"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-slate-800 break-words truncate">
            {value || (
              <span className="text-slate-400 italic">No especificado</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
        <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none">
          {value}
        </p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
          {label}
        </p>
        {subtext && (
          <p className="text-[10px] text-slate-500 font-medium">{subtext}</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const styles: Record<string, string> = {
    confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
    finalizada: "bg-slate-100 text-slate-600 border-slate-200",
    pendiente_pago: "bg-amber-100 text-amber-700 border-amber-200",
    cancelada: "bg-rose-100 text-rose-700 border-rose-200",
    expirada: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles[s] || styles.finalizada}`}
    >
      {s.replace("_", " ")}
    </span>
  );
}

export default function UsuarioDetalleClient({
  clubId,
  idUsuario,
}: {
  clubId: number;
  idUsuario: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/usuarios/${idUsuario}?clubId=${clubId}`,
      );
      if (!res.ok) throw new Error("Error cargando perfil");
      setUserData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [idUsuario, clubId]);

  const handleToggleRole = async (roleName: string) => {
    if (
      !confirm(
        `¿Confirmas cambiar el permiso de ${roleName.toUpperCase()} para este usuario?`,
      )
    )
      return;
    setTogglingRole(roleName);
    try {
      const res = await fetch(`/api/admin/usuarios/${idUsuario}/roles`, {
        method: "POST",
        body: JSON.stringify({ clubId, roleName }),
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Error al actualizar permisos");
        return;
      }
      await load(); // Recargar datos frescos
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    } finally {
      setTogglingRole(null);
    }
  };

  // Stats Logic (Simplificada)
  const stats = useMemo(() => {
    if (!userData) return null;
    const total = userData.reservas.length;
    const gastado = userData.reservas
      .filter((r) => r.estado === "finalizada" || r.estado === "confirmada")
      .reduce((acc, curr) => acc + Number(curr.precio_total), 0);
    const canceladas = userData.reservas.filter(
      (r) => r.estado === "cancelada",
    ).length;
    const cancelRate =
      total > 0 ? ((canceladas / total) * 100).toFixed(0) : "0";
    const ultima =
      total > 0
        ? new Date(userData.reservas[0].fecha).toLocaleDateString("es-AR")
        : "-";

    // Cancha Favorita
    const counts: Record<string, number> = {};
    userData.reservas.forEach((r) => {
      counts[r.canchas?.nombre || "Varios"] =
        (counts[r.canchas?.nombre || "Varios"] || 0) + 1;
    });
    const favCourt =
      Object.keys(counts).length > 0
        ? Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b))
        : "-";

    return { total, gastado, cancelRate, favCourt, ultima };
  }, [userData]);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="animate-spin mr-2" /> Cargando...
      </div>
    );
  if (!userData || !stats)
    return (
      <div className="p-8 text-center text-red-500">Usuario no encontrado</div>
    );

  const esAdmin = userData.roles.includes("admin");
  const esCajero = userData.roles.includes("cajero");
  const iniciales =
    `${userData.nombre.charAt(0)}${userData.apellido.charAt(0)}`.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/admin/usuarios"
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Perfil de Jugador
            </h1>
            <p className="text-sm text-slate-500">
              Gestión de permisos y estadísticas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          {/* COLUMNA IZQ: PERFIL Y PERMISOS */}
          <div className="space-y-6 xl:col-span-1">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-900 to-slate-900 relative">
                {userData.bloqueado && (
                  <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center backdrop-blur-sm">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                      <Ban size={12} /> BLOQUEADO
                    </span>
                  </div>
                )}
              </div>
              <div className="px-6 pb-6">
                <div className="relative flex justify-between items-end -mt-12 mb-4">
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-white text-slate-800 flex items-center justify-center text-3xl font-bold shadow-md z-10">
                    {iniciales}
                  </div>
                  {/* Badges de Roles Activos */}
                  <div className="mb-1 flex gap-1 flex-wrap justify-end">
                    {esAdmin && (
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                        ADMIN
                      </span>
                    )}
                    {esCajero && (
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                        CAJERO
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">
                    {userData.nombre} {userData.apellido}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">
                    {userData.apodo || "Sin apodo"}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  <InfoItem
                    icon={Mail}
                    label="Email"
                    value={userData.email}
                    isLink
                  />
                  <InfoItem
                    icon={Phone}
                    label="Teléfono"
                    value={userData.telefono}
                    isLink
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem
                      icon={Calendar}
                      label="Edad"
                      value={userData.fecha_nacimiento}
                    />
                    <InfoItem
                      icon={User}
                      label="Género"
                      value={userData.genero}
                    />
                  </div>
                </div>

                {/* ZONA DE PELIGRO / GESTIÓN DE ROLES */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Permisos de Sistema
                  </p>
                  <div className="space-y-3">
                    <button
                      disabled={togglingRole === "cajero"}
                      onClick={() => handleToggleRole("cajero")}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        esCajero
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold text-sm">
                        <CreditCard size={16} /> Acceso Cajero
                      </span>
                      {togglingRole === "cajero" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <span className="text-xs font-bold uppercase">
                          {esCajero ? "Revocar" : "Otorgar"}
                        </span>
                      )}
                    </button>

                    <button
                      disabled={togglingRole === "admin"}
                      onClick={() => handleToggleRole("admin")}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        esAdmin
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50 text-slate-600 hover:text-purple-700"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold text-sm">
                        <ShieldCheck size={16} /> Acceso Administrador
                      </span>
                      {togglingRole === "admin" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <span className="text-xs font-bold uppercase">
                          {esAdmin ? "Revocar" : "Otorgar"}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: STATS Y TABLA */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={Trophy}
                label="Reservas Totales"
                value={stats.total}
                color="bg-blue-500"
              />
              <StatCard
                icon={DollarSign}
                label="Inversión Total"
                value={`$${stats.gastado.toLocaleString("es-AR")}`}
                color="bg-emerald-500"
              />
              <StatCard
                icon={History}
                label="Última Visita"
                value={stats.ultima}
                color="bg-purple-500"
              />
            </div>

            {/* TABLA */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Historial
                </h3>
                <span className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-500 font-medium">
                  {userData.reservas.length} jugados
                </span>
              </div>

              {userData.reservas.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                  <Calendar className="w-12 h-12 mb-3 opacity-20" />
                  <p>Sin actividad reciente</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Fecha</th>
                        <th className="px-6 py-3 font-semibold">Horario</th>
                        <th className="px-6 py-3 font-semibold">Cancha</th>
                        <th className="px-6 py-3 font-semibold text-center">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {userData.reservas.map((res) => (
                        <tr
                          key={res.id_reserva}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {new Date(res.fecha).toLocaleDateString("es-AR")}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                            {res.inicio.slice(0, 5)} - {res.fin.slice(0, 5)}
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {res.canchas?.nombre}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge status={res.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
