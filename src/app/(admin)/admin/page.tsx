"use client";

import { useEffect, useState } from "react";
import { StatCard } from "./components/StatCard";
import { ChartReservas } from "./components/ChartReservas";
import { Rol } from "@/lib/roles"; // Asegúrate de tener esto definido
import {
  CalendarDays,
  Users,
  Trophy,
  CreditCard,
  Activity,
  Loader2,
} from "lucide-react";

// Hook simulado para obtener datos del usuario (reemplazar con tu contexto de Auth real)
const useUser = () => {
  // Aquí deberías obtener el rol real desde tu Contexto de Autenticación o Supabase
  return { role: "admin" as Rol, clubId: 1 };
};

export default function DashboardPage() {
  const { role, clubId } = useUser();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    reservasSemana: 0,
    clientesTotal: 0,
    ingresosMes: 0,
    canchaTop: "Calculando...",
  });

  useEffect(() => {
    if (!clubId) return;

    async function fetchStats() {
      try {
        setLoading(true);
        // Llamada a nuestra nueva API
        const res = await fetch(`/api/dashboard/stats?clubId=${clubId}`);
        const data = await res.json();

        if (res.ok) {
          setStats({
            reservasSemana: data.reservasSemana,
            clientesTotal: data.clientesTotal,
            ingresosMes: data.ingresosMes,
            canchaTop: data.canchaTop,
          });
        }
      } catch (error) {
        console.error("Error cargando stats reales", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [clubId]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* --- ENCABEZADO --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Panel de Control
          </h1>
          <p className="text-slate-500 mt-1">
            Resumen de actividad en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-blue-600" />
          ) : (
            <Activity size={16} className="text-green-600 animate-pulse" />
          )}
          <span>
            {loading ? "Actualizando datos..." : "Datos actualizados"}
          </span>
        </div>
      </div>

      {/* --- TARJETAS DE ESTADÍSTICAS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Reservas esta Semana"
          value={loading ? "..." : stats.reservasSemana}
          icon={CalendarDays}
          trend="Semanal"
          trendUp={true}
          description="Turnos ocupados"
          color="blue"
        />
        <StatCard
          title="Clientes Activos"
          value={loading ? "..." : stats.clientesTotal}
          icon={Users}
          trend="Total"
          trendUp={true}
          description="Base de datos"
          color="purple"
        />
        <StatCard
          title="Ingresos (Mes)"
          value={
            loading ? "..." : `$${stats.ingresosMes.toLocaleString("es-AR")}`
          }
          icon={CreditCard}
          trend="Proyectado"
          trendUp={true}
          description="Reservas confirmadas"
          color="green"
        />
        <StatCard
          title="Cancha Top"
          value={loading ? "..." : stats.canchaTop}
          icon={Trophy}
          trend="Ranking"
          trendUp={true}
          description="Más solicitada"
          color="orange"
        />
      </div>

      {/* --- GRÁFICOS (Solo Admin ve el de distribución detallada) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ChartReservas />
        </div>

        {/* RESTRICCIÓN POR ROL EN FRONTEND (Opcional, si quieres ocultar algo al cajero) */}
        {role === "admin" && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm h-[400px] flex flex-col items-center justify-center text-center">
            <Trophy size={48} className="text-yellow-500 mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-slate-800">
              Métricas Avanzadas
            </h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Esta sección es exclusiva para administradores. Aquí se verán
              proyecciones financieras.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
