"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image"; // ✅ Importamos Image
import { format, subDays, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
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
  AlertCircle,
  Info,
  Zap,
  Activity,
  ShieldCheck,
  Building2,
  User,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

import { RevenueChart } from "./components/dashboard/RevenueChart";
import { CourtRanking } from "./components/dashboard/CourtRanking";
import { RecentBookings } from "./components/dashboard/RecentBookings";
import { ClientRanking } from "./components/dashboard/ClientRanking";
import { HourlyActivityChart } from "./components/dashboard/HourlyActivityChart";
import { PaymentStatusPie } from "./components/dashboard/PaymentStatusPie";

// --- COMPONENTE KPI CARD ---
const KpiCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
  subtext,
  tooltip,
}: any) => {
  const colorStyles: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  const currentStyle =
    colorStyles[color] || "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 relative group/card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              {title}
            </p>
            {tooltip && (
              <div className="group/tooltip relative">
                <Info
                  size={12}
                  className="text-slate-300 hover:text-slate-500 cursor-help transition-colors"
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-800 text-white text-[10px] leading-tight rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none text-center">
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>
            )}
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl border ${currentStyle}`}>
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {trend && (
          <span className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full">
            <ArrowUpRight size={10} className="mr-1" /> {trend}
          </span>
        )}
        {subtext && (
          <p
            className="text-xs text-slate-400 font-medium truncate max-w-[120px]"
            title={subtext}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  // Contexto
  const [clubId, setClubId] = useState<number | null>(null);
  const [clubName, setClubName] = useState<string>("");
  const [clubLogo, setClubLogo] = useState<string | null>(null); // ✅ Estado para el Logo
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<"admin" | "cajero" | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Data
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState("30days");

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  // 1. Reloj en tiempo real
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 2. Obtener Club, Usuario y Rol
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // A. Obtener Perfil del Usuario
      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, apellido")
        .eq("id_usuario", user.id)
        .single();

      if (profile) {
        setUserName(`${profile.nombre} ${profile.apellido}`);
      } else {
        setUserName("Usuario");
      }

      // B. Obtener Club
      let currentClubId = 9;
      let currentClubName = "Mi Club";
      let currentClubLogo = null;

      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const subdomain = hostname.split(".")[0];
        if (subdomain && subdomain !== "localhost") {
          const { data } = await supabase
            .from("clubes")
            .select("id_club, nombre, logo_url") // ✅ Agregamos logo_url aquí
            .eq("subdominio", subdomain)
            .single();

          if (data) {
            currentClubId = data.id_club;
            currentClubName = data.nombre;
            currentClubLogo = data.logo_url; // ✅ Guardamos el logo
          }
        }
      }
      setClubId(currentClubId);
      setClubName(currentClubName);
      setClubLogo(currentClubLogo);

      // C. Obtener Rol
      const { data: members } = await supabase
        .from("club_usuarios")
        .select("roles(nombre)")
        .eq("id_usuario", user.id)
        .eq("id_club", currentClubId);

      const isAdmin = members?.some((m: any) => {
        const rName = m.roles?.nombre?.toLowerCase().trim();
        return (
          rName === "admin" ||
          rName === "administrador" ||
          rName === "propietario"
        );
      });

      setUserRole(isAdmin ? "admin" : "cajero");
    };
    init();
  }, [supabase]);

  // 3. Fetch Estadísticas
  useEffect(() => {
    if (!clubId) return;

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

  if (loading || !data?.kpis || !userRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-slate-900 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">
          Sincronizando datos...
        </p>
      </div>
    );
  }

  const { kpis, charts, tablaReservas, comparativaCanchas } = data;
  const isAdmin = userRole === "admin";

  const dateStr = currentTime
    ? format(currentTime, "EEEE d 'de' MMMM", { locale: es })
    : "...";
  const timeStr = currentTime ? format(currentTime, "HH:mm") : "--:--";

  return (
    <div className="flex-1 w-full bg-slate-50 min-h-screen p-6 md:p-10 space-y-10 font-sans">
      {/* --- HEADER PROFESIONAL --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8">
        <div>
          {/* Badge Club & Fecha */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="pl-1 pr-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wide flex items-center gap-2 shadow-sm border border-slate-300">
              {/* ✅ Renderizado Condicional del Logo */}
              {clubLogo ? (
                <div className="relative w-5 h-5 rounded-full overflow-hidden bg-white">
                  <Image
                    src={clubLogo}
                    alt="Logo"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <Building2 size={14} className="text-slate-500 ml-1" />
              )}
              {clubName}
            </span>

            <span className="px-3 py-1 rounded-full bg-white text-slate-500 text-[11px] font-medium border border-slate-200 flex items-center gap-1.5 shadow-sm">
              <CalendarRange size={12} /> {dateStr}
              <span className="w-px h-3 bg-slate-200 mx-1"></span>
              <Clock size={12} /> {timeStr} hs
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight flex items-center gap-3">
            Hola, {userName}
          </h1>
          <p className="text-slate-500 mt-2 max-w-lg text-sm leading-relaxed flex items-center gap-2">
            <User size={14} className="text-slate-400" />
            {isAdmin
              ? "Panel de Administración General"
              : "Panel de Operaciones"}
          </p>
        </div>

        {/* SELECTOR DE RANGO */}
        <div className="relative group min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarRange className="h-4 w-4 text-slate-500" />
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 shadow-sm appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="90days">Último Trimestre</option>
            <option value="year">Este Año</option>
            <option value="all">Histórico Completo</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ArrowRight className="h-3 w-3 text-slate-400 rotate-90" />
          </div>
        </div>
      </div>

      {/* --- 1. SECCIÓN FINANZAS (SOLO ADMIN) --- */}
      {isAdmin && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <h2 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
            <Activity size={14} /> Métricas Financieras
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Venta Bruta"
              value={`$${kpis.ingresos.toLocaleString("es-AR")}`}
              icon={DollarSign}
              color="blue"
              trend={dateRange === "all" ? "" : ""}
              subtext="Facturación total"
              tooltip="Suma total de todas las reservas confirmadas (Web + Manual)."
            />
            <KpiCard
              title="Saldo Pendiente"
              value={`$${kpis.saldoCobrar.toLocaleString("es-AR")}`}
              icon={Wallet}
              color="rose"
              subtext="A cobrar en club"
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
              subtext={`${kpis.clientesNuevos} nuevos clientes`}
              tooltip="Clientes únicos que jugaron en este periodo."
            />
          </div>
        </div>
      )}

      {/* --- 2. SECCIÓN OPERATIVA (VISIBLE PARA TODOS) --- */}
      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700 delay-100">
        <h2 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
          <ShieldCheck size={14} /> Rendimiento Operativo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {!isAdmin && (
            <KpiCard
              title="Cartera Activa"
              value={kpis.clientesNuevos + kpis.clientesRecurrentes}
              icon={Users}
              color="indigo"
              subtext={`${kpis.clientesNuevos} nuevos`}
              tooltip="Clientes únicos que jugaron en este periodo."
            />
          )}

          <KpiCard
            title="Turnos Jugados"
            value={kpis.reservas}
            icon={CalendarCheck}
            color="violet"
            subtext="Reservas concretadas"
          />
          <KpiCard
            title="Volumen Horas"
            value={`${kpis.horasVendidas} hs`}
            icon={Clock}
            color="cyan"
            subtext="Ocupación de pista"
          />
          <KpiCard
            title="Tasa Cancelación"
            value={`${kpis.tasaCancelacion.toFixed(1)}%`}
            icon={AlertCircle}
            color="red"
            subtext="Turnos caídos"
          />
        </div>
      </div>

      {/* --- 3. GRÁFICOS DETALLADOS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 animate-in slide-in-from-bottom-4 duration-700 delay-200">
        {/* Gráfico Financiero (SOLO ADMIN) */}
        {isAdmin ? (
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Evolución de Ingresos
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Comportamiento diario de la facturación
                </p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <BarChart3 className="text-slate-400" size={20} />
              </div>
            </div>
            <div className="h-[300px] w-full">
              <RevenueChart data={charts.revenue} />
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-blue-500" /> Próximas
                  Reservas
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Agenda operativa inmediata
                </p>
              </div>
              <Link
                href="/admin/reservas"
                className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
              >
                Ver Agenda Completa <ArrowRight size={12} />
              </Link>
            </div>
            <div className="flex-1">
              <RecentBookings data={tablaReservas} />
            </div>
          </div>
        )}

        {/* Columna Derecha: Widgets */}
        <div className="space-y-6">
          {isAdmin && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-500" /> Estado de
                    Cobros
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Proporción Cobrado vs Pendiente
                  </p>
                </div>
              </div>
              <div className="h-[200px]">
                <PaymentStatusPie data={charts.payments} />
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
            <div className="mb-6">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Horarios de Mayor
                Demanda
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Concentración de reservas por hora
              </p>
            </div>
            <div className="h-[200px]">
              <HourlyActivityChart data={charts.hourly} />
            </div>
          </div>
        </div>
      </div>

      {/* --- 4. SECCIÓN INFERIOR --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <CalendarRange className="w-5 h-5 text-blue-600" /> Próximas
                  Reservas
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Próximos turnos a disputarse
                </p>
              </div>

              <Link
                href="/admin/reservas"
                className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
              >
                Ir a Agenda <ArrowRight size={12} />
              </Link>
            </div>

            <div className="flex-1 min-h-[300px]">
              <RecentBookings data={tablaReservas} />
            </div>
          </div>
        )}

        <div
          className={`space-y-6 ${!isAdmin ? "lg:col-span-3 grid lg:grid-cols-2 gap-6 space-y-0" : ""}`}
        >
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-600" /> Ranking de
                Canchas
              </h3>
            </div>
            <div className="w-full min-h-[250px]">
              <CourtRanking data={comparativaCanchas || []} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" /> Clientes
                Frecuentes
              </h3>
            </div>
            <div className="flex-1">
              <ClientRanking data={charts.topClientes} />
            </div>
            <div className="mt-6 pt-4 border-t border-slate-50">
              <Link
                href="/admin/usuarios"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs text-slate-500 font-bold hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all"
              >
                Ver Base de Datos <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
