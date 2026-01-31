import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import {
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  getDay,
  differenceInMinutes,
  differenceInHours,
  getHours,
} from "date-fns";
import { es } from "date-fns/locale";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get("clubId");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (!clubId)
      return NextResponse.json({ error: "Falta Club ID" }, { status: 400 });

    const now = new Date();
    const startDate = fromParam ? new Date(fromParam) : startOfMonth(now);
    const endDate = toParam ? new Date(toParam) : endOfMonth(now);

    // 1. DATA HISTÓRICA
    const { data: reservas, error } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        id_cancha, fecha, inicio, fin, precio_total, monto_anticipo, 
        estado, id_usuario, created_at, cliente_nombre,
        canchas (nombre)
      `,
      )
      .eq("id_club", clubId)
      .gte("fecha", startDate.toISOString())
      .lte("fecha", endDate.toISOString());

    if (error) throw error;

    // 2. PERFILES (Solo para usuarios web)
    const userIds = Array.from(
      new Set(reservas?.map((r) => r.id_usuario).filter(Boolean)),
    ) as string[];
    const profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id_usuario, nombre, apellido, email")
        .in("id_usuario", userIds);
      profiles?.forEach((p) => profilesMap.set(p.id_usuario, p));
    }

    // --- 3. PROCESAMIENTO AVANZADO ---

    let totalIngresos = 0;
    let totalSaldoCobrar = 0;
    let totalCobrado = 0;
    let totalReservasValidas = 0;
    let totalCanceladas = 0;
    let minutosVendidos = 0;
    let sumaLeadTimeHoras = 0;

    const performanceCanchas = new Map();
    const clientesStats = new Map();
    const ingresosPorDia = new Map();
    const reservasPorDiaSemana = new Array(7).fill(0);
    const actividadPorHora = new Array(24).fill(0);

    reservas?.forEach((r: any) => {
      if (r.estado === "cancelada") {
        totalCanceladas++;
        return;
      }

      totalReservasValidas++;
      const ingresoTotal = Number(r.precio_total);
      const anticipo = Number(r.monto_anticipo || 0);

      // Finanzas
      totalIngresos += ingresoTotal;
      const saldo = ingresoTotal - anticipo;
      totalSaldoCobrar += saldo;
      totalCobrado += anticipo;

      // Tiempo
      const fechaBase = r.fecha;
      // Validación básica de fechas para evitar errores
      if (!r.inicio || !r.fin) return;

      const startDateTime = parseISO(`${fechaBase}T${r.inicio}`);
      const endDateTime = parseISO(`${fechaBase}T${r.fin}`);
      const createdDateTime = parseISO(r.created_at);

      const duracionMinutos = differenceInMinutes(endDateTime, startDateTime);
      if (duracionMinutos > 0) minutosVendidos += duracionMinutos;

      const leadTime = differenceInHours(startDateTime, createdDateTime);
      if (leadTime > 0) sumaLeadTimeHoras += leadTime;

      // Por Hora
      const horaInicio = getHours(startDateTime);
      if (horaInicio >= 0 && horaInicio < 24) {
        actividadPorHora[horaInicio] += 1;
      }

      // Por Cancha
      const nombreCancha = r.canchas?.nombre || `Cancha ${r.id_cancha}`;
      if (!performanceCanchas.has(nombreCancha)) {
        performanceCanchas.set(nombreCancha, {
          name: nombreCancha,
          ingresos: 0,
          reservas: 0,
        });
      }
      const pc = performanceCanchas.get(nombreCancha);
      pc.ingresos += ingresoTotal;
      pc.reservas += 1;

      // Por Cliente (Web + Manual)
      let clienteKey = "";
      let clienteNombre = "Anónimo";

      if (r.id_usuario) {
        clienteKey = r.id_usuario;
        const p = profilesMap.get(r.id_usuario);
        clienteNombre = p ? `${p.nombre} ${p.apellido}` : "Usuario Web";
      } else {
        // Cliente Manual
        const rawName = r.cliente_nombre || "Cliente Manual";
        clienteKey = `manual-${rawName.toLowerCase().trim()}`;
        clienteNombre = rawName;
      }

      if (!clientesStats.has(clienteKey)) {
        clientesStats.set(clienteKey, {
          id: clienteKey,
          name: clienteNombre,
          reservas: 0,
          gastado: 0,
        });
      }
      const cs = clientesStats.get(clienteKey);
      cs.reservas += 1;
      cs.gastado += ingresoTotal;

      // Por Fecha
      const fechaStr = format(parseISO(r.fecha), "dd MMM", { locale: es });
      ingresosPorDia.set(
        fechaStr,
        (ingresosPorDia.get(fechaStr) || 0) + ingresoTotal,
      );

      // Por Día Semana
      const dayIndex = getDay(parseISO(r.fecha));
      reservasPorDiaSemana[dayIndex] += 1;
    });

    // --- CÁLCULOS FINALES ---
    const totalReservas = totalReservasValidas + totalCanceladas;
    const tasaCancelacion =
      totalReservas > 0 ? (totalCanceladas / totalReservas) * 100 : 0;
    const horasVendidas = Math.round(minutosVendidos / 60);
    const anticipacionPromedio =
      totalReservasValidas > 0
        ? Math.round(sumaLeadTimeHoras / totalReservasValidas)
        : 0;

    // Clientes
    let clientesRecurrentes = 0;
    let clientesNuevos = 0;
    clientesStats.forEach((val) => {
      if (val.reservas > 1) clientesRecurrentes++;
      else clientesNuevos++;
    });

    // Formateo Gráficos
    const chartRevenue = Array.from(ingresosPorDia).map(([name, value]) => ({
      name,
      value,
    }));
    const diasSemanaNombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const chartDiaSemana = reservasPorDiaSemana.map((val, i) => ({
      name: diasSemanaNombres[i],
      reservas: val,
    }));

    const chartHoras = actividadPorHora
      .map((val, i) => ({
        name: `${i}:00`,
        reservas: val,
      }))
      .filter((h) => h.reservas > 0);

    const chartPagos = [
      { name: "Cobrado (Señas)", value: totalCobrado },
      { name: "Pendiente (Saldo)", value: totalSaldoCobrar },
    ];

    const topClientes = Array.from(clientesStats.values())
      .sort((a, b) => b.gastado - a.gastado)
      .slice(0, 5);
    const chartCanchas = Array.from(performanceCanchas.values()).sort(
      (a, b) => b.ingresos - a.ingresos,
    );

    // 4. DATA EN VIVO
    const { data: proximasRaw } = await supabaseAdmin
      .from("reservas")
      .select(
        `id_reserva, inicio, fin, fecha, precio_total, estado, id_usuario, cliente_nombre, canchas(nombre)`,
      )
      .eq("id_club", clubId)
      .neq("estado", "cancelada")
      .gte("fecha", now.toISOString().split("T")[0])
      .order("fecha", { ascending: true })
      .order("inicio", { ascending: true })
      .limit(7);

    const proximas = proximasRaw?.map((p: any) => {
      let nombreDisplay = "Cliente";
      let emailDisplay = "-";

      if (p.id_usuario && profilesMap.has(p.id_usuario)) {
        const pr = profilesMap.get(p.id_usuario);
        nombreDisplay = `${pr.nombre} ${pr.apellido}`;
        emailDisplay = pr.email;
      } else {
        nombreDisplay = p.cliente_nombre || "Cliente Manual";
      }

      return {
        ...p,
        cliente: nombreDisplay,
        email: emailDisplay,
      };
    });

    return NextResponse.json({
      kpis: {
        ingresos: totalIngresos,
        saldoCobrar: totalSaldoCobrar,
        reservas: totalReservasValidas,
        horasVendidas,
        anticipacion: anticipacionPromedio,
        tasaCancelacion,
        ticketPromedio: totalReservasValidas
          ? totalIngresos / totalReservasValidas
          : 0,
        clientesNuevos,
        clientesRecurrentes,
      },
      charts: {
        revenue: chartRevenue,
        weekDays: chartDiaSemana,
        hourly: chartHoras,
        payments: chartPagos,
        topClientes,
      },
      comparativaCanchas: chartCanchas,
      tablaReservas: proximas || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
