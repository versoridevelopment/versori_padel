"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, subDays, startOfYear } from "date-fns";
import {
  DollarSign,
  Users,
  CalendarCheck,
  TrendingUp,
  BarChart3,
  Loader2,
  ArrowUpRight,
  CalendarRange,
  PieChart,
  ArrowRight,
  Clock,
  Wallet,
  Hourglass,
  AlertCircle,
  Info,
  Zap,
} from "lucide-react";

import { RevenueChart } from "./components/dashboard/RevenueChart";
import { CourtRanking } from "./components/dashboard/CourtRanking";
import { RecentBookings } from "./components/dashboard/RecentBookings";
import { ClientRanking } from "./components/dashboard/ClientRanking";
import { HourlyActivityChart } from "./components/dashboard/HourlyActivityChart";
import { PaymentStatusPie } from "./components/dashboard/PaymentStatusPie";

// --- COMPONENTE KPI CARD CON TOOLTIP ---
const KpiCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
  subtext,
  tooltip,
}: any) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative group/card">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2.5 rounded-xl bg-${color}-50 text-${color}-600`}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      {trend && (
        <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
          <ArrowUpRight size={10} className="mr-1" /> {trend}
        </span>
      )}
    </div>
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
          {title}
        </p>
        {tooltip && (
          <div className="group/tooltip relative">
            <Info
              size={12}
              className="text-slate-300 hover:text-blue-500 cursor-help"
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none text-center">
              {tooltip}
              {/* Triangulito decorativo */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">
        {value}
      </h3>
      {subtext && (
        <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>
      )}
    </div>
  </div>
);

export default function DashboardPage() {
  const clubId = 1;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState("30days");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        let fromDate = subDays(now, 30);

        if (dateRange === "7days") fromDate = subDays(now, 7);
        if (dateRange === "90days") fromDate = subDays(now, 90);
        if (dateRange === "year") fromDate = startOfYear(now);
        if (dateRange === "all") fromDate = new Date("2020-01-01");

        const from = format(fromDate, "yyyy-MM-dd");
        const to = format(now, "yyyy-MM-dd");

        const res = await fetch(
          `/api/dashboard/stats?clubId=${clubId}&from=${from}&to=${to}`,
        );
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clubId, dateRange]);

  if (loading || !data?.kpis) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">
          Calculando métricas del club...
        </p>
      </div>
    );
  }

  const { kpis, charts, tablaReservas, comparativaCanchas } = data;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Centro de Control
          </h1>
          <p className="text-slate-500 mt-1">
            Análisis financiero y operativo detallado.
          </p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <CalendarRange size={16} className="text-slate-400 ml-3 mr-2" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer py-2 pr-8 outline-none"
          >
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="90days">Último Trimestre</option>
            <option value="year">Este Año</option>
            <option value="all">Histórico Completo</option>
          </select>
        </div>
      </div>

      {/* --- 1. KPIs FINANCIEROS --- */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-[-15px] pl-1">
        Finanzas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Venta Bruta"
          value={`$${kpis.ingresos.toLocaleString("es-AR")}`}
          icon={DollarSign}
          color="blue"
          trend={dateRange === "all" ? "" : "+12.5%"}
          subtext="Facturación total"
          tooltip="Suma total de todas las reservas confirmadas."
        />
        <KpiCard
          title="Saldo por Cobrar"
          value={`$${kpis.saldoCobrar.toLocaleString("es-AR")}`}
          icon={Wallet}
          color="rose"
          subtext="Pendiente en club"
          tooltip="Dinero que falta cobrar (Precio Total - Seña)."
        />
        <KpiCard
          title="Ticket Promedio"
          value={`$${Math.round(kpis.ticketPromedio).toLocaleString("es-AR")}`}
          icon={TrendingUp}
          color="emerald"
          subtext="Por reserva"
          tooltip="Valor promedio de cada turno vendido."
        />
        <KpiCard
          title="Cartera Activa"
          value={kpis.clientesNuevos + kpis.clientesRecurrentes}
          icon={Users}
          color="indigo"
          subtext={`${kpis.clientesNuevos} nuevos`}
          tooltip="Clientes únicos que jugaron en este periodo."
        />
      </div>

      {/* --- 2. KPIs OPERATIVOS --- */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-[-15px] pl-1 mt-2">
        Operativa
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Turnos Jugados"
          value={kpis.reservas}
          icon={CalendarCheck}
          color="violet"
          subtext="Reservas ok"
        />
        <KpiCard
          title="Volumen Horas"
          value={`${kpis.horasVendidas} hs`}
          icon={Clock}
          color="cyan"
          subtext="Ocupación real"
        />

        <KpiCard
          title="Cancelaciones"
          value={`${kpis.tasaCancelacion.toFixed(1)}%`}
          icon={AlertCircle}
          color="red"
          subtext="Tasa de caída"
        />
      </div>

      {/* --- 3. GRÁFICOS ESTRATÉGICOS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Gráfico Financiero (2/3 ancho) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Curva de Ingresos
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Evolución diaria de facturación
              </p>
            </div>
          </div>
          <RevenueChart data={charts.revenue} />
        </div>

        {/* Columna Derecha: Pagos + Horas Pico (1/3 ancho) */}
        <div className="space-y-6">
          {/* Estado de Pagos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" /> Estado de Cobros
              </h3>
              <p className="text-[10px] text-slate-400">Cobrado vs Pendiente</p>
            </div>
            <PaymentStatusPie data={charts.payments} />
          </div>

          {/* Horas Pico */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Horas Calientes
              </h3>
              <p className="text-[10px] text-slate-400">
                Concentración horaria de demanda
              </p>
            </div>
            <HourlyActivityChart data={charts.hourly} />
          </div>
        </div>
      </div>

      {/* --- 4. SECCIÓN INFERIOR: TABLA + RANKINGS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla Próximas Reservas (2/3 ancho) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div>
              <h3 className="font-bold text-lg text-slate-800">
                Próximas Reservas
              </h3>
              <p className="text-xs text-slate-500">Agenda operativa futura</p>
            </div>

            <Link
              href="/admin/reservas"
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Ir a Agenda <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex-1">
            <RecentBookings data={tablaReservas} />
          </div>
        </div>

        {/* Columna Derecha: Rankings Apilados (1/3 ancho) */}
        <div className="space-y-6">
          {/* Top Canchas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Top Canchas
              </h3>
            </div>
            {/* Ajuste de altura para que el gráfico no corte etiquetas */}
            <div className="w-full min-h-[250px]">
              <CourtRanking data={comparativaCanchas || []} />
            </div>
          </div>

          {/* Top Clientes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-4 flex justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" /> Clientes Más
                Habituales
              </h3>
            </div>
            <div className="flex-1">
              <ClientRanking data={charts.topClientes} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50">
              <Link
                href="/admin/usuarios"
                className="flex items-center justify-center gap-2 w-full py-2 text-xs text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all"
              >
                Ver Usuarios <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
