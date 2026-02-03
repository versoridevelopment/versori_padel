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

// ✅ DEFINICIÓN COMPLETA: Estilos de Alto Contraste para el Formulario y Agenda
export const TIPO_TURNO_CONFIG: Record<
  string,
  { border: string; bg: string; text: string; label: string }
> = {
  normal: {
    border: "border-l-slate-400",
    bg: "bg-white",
    text: "text-slate-700",
    label: "Normal",
  },
  fijo: {
    border: "border-l-neutral-800",
    bg: "bg-neutral-200",
    text: "text-neutral-900",
    label: "Fijo",
  },
  profesor: {
    border: "border-l-blue-700",
    bg: "bg-blue-100",
    text: "text-blue-900",
    label: "Profesor",
  },
  torneo: {
    border: "border-l-orange-600",
    bg: "bg-orange-100",
    text: "text-orange-900",
    label: "Torneo",
  },
  escuela: {
    border: "border-l-cyan-600",
    bg: "bg-cyan-100",
    text: "text-cyan-900",
    label: "Escuela",
  },
  cumpleanos: {
    border: "border-l-pink-600",
    bg: "bg-pink-100",
    text: "text-pink-900",
    label: "Cumpleaños",
  },
  abonado: {
    border: "border-l-emerald-700",
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    label: "Abonado",
  },
};

// Helper para obtener la configuración garantizando un fallback
export const getTipoTurnoConfig = (tipo?: string | null) => {
  const t = String(tipo || "normal").toLowerCase();
  if (t.includes("cumple")) return TIPO_TURNO_CONFIG.cumpleanos;
  return TIPO_TURNO_CONFIG[t] || TIPO_TURNO_CONFIG.normal;
};

// ✅ LEGACY: Mantener por compatibilidad si otros componentes lo usan
export const TIPO_TURNO_STYLES: Record<string, string> = {
  normal: "bg-white border-slate-200 text-slate-600",
  profesor: "bg-indigo-100 border-indigo-200 text-indigo-700",
  torneo: "bg-fuchsia-100 border-fuchsia-200 text-fuchsia-700",
  escuela: "bg-cyan-100 border-cyan-200 text-cyan-700",
  cumpleanos: "bg-amber-100 border-amber-200 text-amber-700",
  abonado: "bg-emerald-100 border-emerald-200 text-emerald-700",
  fijo: "bg-slate-100 border-slate-300 text-slate-800 ring-1 ring-slate-200 font-bold",
};

export const getTipoTurnoStyle = (tipo?: string | null) => {
  const t = String(tipo || "normal").toLowerCase();
  if (t.includes("cumple")) return TIPO_TURNO_STYLES.cumpleanos;
  return TIPO_TURNO_STYLES[t] || TIPO_TURNO_STYLES.normal;
};

// --- Tipos de Datos de Interfaz ---

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
  id_usuario?: string | null;
  id_cliente_manual?: number | null;
  precio_total: number;
  monto_anticipo?: number;
  pagos_aprobados_total: number;
  saldo_pendiente: number;
  estado: string;
  tipo_turno: string | null;
  notas: string | null;
  origen: string;
  manual?: {
    nombre: string;
    email?: string;
    telefono?: string;
    notas?: string;
  } | null;
};

export type CanchaUI = {
  id_cancha: number;
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  es_exterior: boolean;
  theme: CourtTheme;
  id_tarifario?: number | null;
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
