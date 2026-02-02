export type CourtTheme = "blue" | "green" | "purple" | "orange" | "rose";

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

export type CierreUI = {
  id_cierre: number;
  inicio: string;
  fin: string;
  motivo: string | null;
};

export type ReservaUI = {
  id_reserva: number;
  id_cancha: number;
  fecha: string;

  horaInicio: string;
  horaFin: string;

  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;

  precio_total: number;
  monto_anticipo: number;
  pagos_aprobados_total: number;
  saldo_pendiente: number;

  estado: string;
  tipo_turno: string | null;
  notas: string | null;
  origen: string;
};

// 👇 AQUÍ ESTABA EL ERROR: Faltaba definir reservas y cierres
export type CanchaUI = {
  id_cancha: number;
  nombre: string;
  descripcion?: string | null; // Opcional por si acaso
  imagen_url?: string | null;
  es_exterior: boolean;
  theme: CourtTheme;
  id_tarifario?: number | null;

  // ✅ AGREGAR ESTAS DOS LÍNEAS PARA SOLUCIONAR EL ERROR
  reservas?: ReservaUI[];
  cierres?: CierreUI[];
};

export type AgendaApiResponse = {
  ok: boolean;
  id_club: number;
  canchas: CanchaUI[];
  startHour: number;
  endHour: number;
  reservas?: ReservaUI[];
};
