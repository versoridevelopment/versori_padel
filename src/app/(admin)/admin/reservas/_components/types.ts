export type CourtTheme = "blue" | "green" | "purple" | "orange" | "rose";

// ✅ NUEVO: Definición para el cierre
export type CierreUI = {
  id_cierre: number;
  inicio: string; // HH:MM
  fin: string; // HH:MM
  motivo: string | null;
};

export type CanchaUI = {
  id_cancha: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  es_exterior: boolean;
  theme: CourtTheme;
  id_tarifario: number | null;
  cierres: CierreUI[]; // ✅ Agregamos lista de cierres a la cancha
};

export type ReservaUI = {
  id_reserva: number;
  id_cancha: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  fin_dia_offset: number;
  estado: string;
  precio_total: number;
  monto_anticipo: number;
  pagos_aprobados_total: number;
  saldo_pendiente: number;
  segmento: string | null;
  tipo_turno: string | null;
  notas: string | null;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  inicio_ts: string;
  fin_ts: string;
  origen?: string;
};

export type AgendaApiResponse = {
  ok: true;
  id_club: number;
  fecha: string;
  startHour: number;
  endHour: number;
  canchas: CanchaUI[];
  reservas: ReservaUI[];
};

export const THEME_COLORS: Record<
  CourtTheme,
  { header: string; bg: string; border: string }
> = {
  blue: {
    header: "bg-blue-600 text-white",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  green: {
    header: "bg-emerald-600 text-white",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  purple: {
    header: "bg-purple-600 text-white",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  orange: {
    header: "bg-orange-600 text-white",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  rose: {
    header: "bg-rose-600 text-white",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
};
