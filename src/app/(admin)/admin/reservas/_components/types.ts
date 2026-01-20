// _components/types.ts

export type CourtTheme = "blue" | "green" | "purple" | "orange" | "rose";

export type Cancha = {
  id: number;
  nombre: string;
  tipo: string;
  superficie: string;
  imagenUrl: string;
  esExterior: boolean;
  theme: CourtTheme;
};

export type Pago = {
  id: number;
  monto: number;
  metodo: "mercadopago" | "efectivo" | "transferencia";
  estado: "approved" | "pending" | "rejected";
  fecha: string;
};

// Historial del jugador (Calculado en backend normalmente)
export type PlayerHistory = {
  deudas: number; // Cantidad de deudas
  ausencias: number; // Cantidad de "No shows"
  partidosJugados: number;
};

export type Reserva = {
  id: number;
  canchaId: number;
  nombreCancha?: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm

  // Datos Cliente (Tabla profiles)
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string;

  // Datos UI Historial (Simulados o traídos de una vista SQL)
  clienteHistory?: PlayerHistory;

  precioTotal: number;
  montoSenia: number;
  saldoPendiente: number;

  estado:
    | "confirmada"
    | "pendiente_pago"
    | "cancelada"
    | "expirada"
    | "finalizada";
  tipoTurno: "normal" | "profesor" | "torneo" | "escuela" | "cumpleanos"; // Mapea a 'segmento' en DB

  createdAt: string;
  pagos: Pago[];
  notas?: string;
  color: string;
};

// ... MOCK_CANCHAS ... (Mismo de antes)
export const MOCK_CANCHAS: Cancha[] = [
  {
    id: 1,
    nombre: "Central",
    tipo: "Pádel",
    superficie: "Sintético",
    imagenUrl: "/cancha1.jpg",
    esExterior: false,
    theme: "blue",
  },
  {
    id: 2,
    nombre: "Panorámica",
    tipo: "Pádel",
    superficie: "Sintético",
    imagenUrl: "/cancha2.jpg",
    esExterior: true,
    theme: "purple",
  },
  {
    id: 3,
    nombre: "Cancha 3",
    tipo: "Pádel",
    superficie: "Cemento",
    imagenUrl: "/cancha3.jpg",
    esExterior: true,
    theme: "green",
  },
];

export const MOCK_RESERVAS: Reserva[] = [
  {
    id: 5999696,
    canchaId: 1,
    nombreCancha: "Cancha 2",
    fecha: new Date().toISOString(),
    horaInicio: "17:00",
    horaFin: "18:30",
    clienteId: "u1",
    clienteNombre: "Ignacio",
    clienteTelefono: "+543795588687",
    clienteEmail: "ignacio@test.com",
    clienteHistory: { deudas: 0, ausencias: 0, partidosJugados: 12 }, // Mock historial
    precioTotal: 36000,
    montoSenia: 18000,
    saldoPendiente: 18000,
    estado: "confirmada",
    tipoTurno: "normal",
    createdAt: new Date().toISOString(),
    pagos: [],
    color: "border-l-blue-600 text-blue-900 bg-blue-50",
  },
];

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
