"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Printer,
  RotateCcw,
  FileJson,
  Loader2,
  Calendar,
  User,
  CreditCard,
  Clock,
  ExternalLink,
} from "lucide-react";

// --- TIPOS ---
type PagoDetalle = {
  id_pago: number;
  provider: string;
  status: string;
  status_detail: string;
  amount: number;
  currency: string;
  mp_payment_id: string;
  created_at: string;
  approved_at: string | null;
  method: string;
  card_last4?: string;

  cliente: {
    id_usuario: string;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
  };
  reserva: {
    id_reserva: number;
    fecha: string;
    inicio: string;
    fin: string;
    cancha: string;
    precio_total_reserva: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
};

// Componente Badge Grande
function StatusBadgeLarge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    in_process: "bg-amber-100 text-amber-800 border-amber-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    refunded: "bg-gray-100 text-gray-800 border-gray-200",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons: Record<string, any> = {
    approved: CheckCircle2,
    in_process: AlertCircle,
    pending: AlertCircle,
    rejected: XCircle,
    refunded: RotateCcw,
  };

  const style = styles[status] || styles.in_process;
  const Icon = icons[status] || AlertCircle;

  const labelMap: Record<string, string> = {
    approved: "Aprobado",
    rejected: "Rechazado",
    in_process: "En revisión",
    pending: "Pendiente",
    refunded: "Reembolsado",
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${style} w-fit`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-semibold text-sm uppercase tracking-wide">
        {labelMap[status] || status}
      </span>
    </div>
  );
}

type PageParams = { id: string };

export default function DetallePagoPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pago, setPago] = useState<PagoDetalle | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/pagos/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Pago no encontrado");
          throw new Error("Error cargando el pago");
        }
        const data = await res.json();
        setPago(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // FUNCIONALIDAD DE IMPRESIÓN
  const handlePrint = () => {
    window.print();
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p>Cargando detalle...</p>
        </div>
      </div>
    );

  if (error || !pago)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-900">Error</h2>
          <p className="text-gray-500 mb-4">
            {error || "No se encontró el pago"}
          </p>
          <Link href="/admin/pagos" className="text-blue-600 hover:underline">
            Volver al listado
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6 print:p-0 print:bg-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER NAV (Oculto al imprimir) */}
        <div className="flex items-center gap-4 print:hidden">
          <Link
            href="/admin/pagos"
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Pago #{pago.id_pago}
              <span className="text-sm font-normal text-gray-400 font-mono hidden sm:inline-block">
                MP: {pago.mp_payment_id}
              </span>
            </h1>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {/* HEADER SOLO IMPRESIÓN */}
        <div className="hidden print:block mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold">Comprobante de Pago</h1>
          <p className="text-gray-500">
            Ref: #{pago.id_pago} - {pago.mp_payment_id}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">
            {/* TARJETA PRINCIPAL DE ESTADO */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:border-0 print:shadow-none print:p-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    Estado de la transacción
                  </p>
                  <StatusBadgeLarge status={pago.status} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Monto Cobrado</p>
                  <span className="text-4xl font-bold text-gray-900 tracking-tight">
                    ${pago.amount.toLocaleString("es-AR")}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">
                    {pago.currency}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Fecha de Creación
                  </p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {new Date(pago.created_at).toLocaleDateString("es-AR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-1 ml-6">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(pago.created_at).toLocaleTimeString("es-AR")}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Método de Pago
                  </p>
                  <div className="flex items-center gap-2 text-gray-700">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="capitalize">
                      {pago.method.replace("_", " ")}
                    </span>
                  </div>
                  {pago.card_last4 && (
                    <p className="text-sm text-gray-500 mt-1 ml-6">
                      Terminada en •••• {pago.card_last4}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* DETALLES DE LA RESERVA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:border print:border-gray-300">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" /> Detalle de la
                Reserva
              </h3>
              <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 print:bg-gray-50 print:border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase print:text-black">
                      Cancha
                    </p>
                    <p className="text-gray-900 font-medium">
                      {pago.reserva.cancha}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase print:text-black">
                      Horario
                    </p>
                    <p className="text-gray-900 font-medium">
                      {pago.reserva.inicio?.slice(0, 5)} -{" "}
                      {pago.reserva.fin?.slice(0, 5)} hs
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase print:text-black">
                      Fecha
                    </p>
                    <p className="text-gray-900 font-medium">
                      {pago.reserva.fecha}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase print:text-black">
                      ID Reserva
                    </p>
                    <Link
                      href={`/admin/reservas?q=${pago.reserva.id_reserva}`}
                      className="text-blue-600 hover:underline font-mono print:no-underline print:text-black"
                    >
                      #{pago.reserva.id_reserva}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* RAW DATA (Oculto al imprimir) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors list-none">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileJson className="w-4 h-4 text-gray-400" />
                    Datos técnicos (Mercado Pago Raw)
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400 transition-transform group-open:-rotate-90" />
                </summary>
                <div className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto max-h-96">
                  <pre>{JSON.stringify(pago.raw, null, 2)}</pre>
                </div>
              </details>
            </div>
          </div>

          {/* SIDEBAR LATERAL */}
          <div className="space-y-6">
            {/* DATOS DEL CLIENTE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:border print:border-gray-300">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" /> Cliente
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold print:border print:border-gray-300">
                  {pago.cliente.nombre[0]}
                </div>
                <div>
                  {/* ENLACE AL PERFIL DE USUARIO */}
                  {pago.cliente.id_usuario !== "invitado" ? (
                    <Link
                      href={`/admin/usuarios/${pago.cliente.id_usuario}`}
                      className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {pago.cliente.nombre} {pago.cliente.apellido}
                      <ExternalLink size={12} />
                    </Link>
                  ) : (
                    <p className="text-sm font-bold text-gray-900">
                      {pago.cliente.nombre} {pago.cliente.apellido}
                    </p>
                  )}

                  <p className="text-xs text-gray-500">
                    {pago.cliente.id_usuario === "invitado"
                      ? "Invitado (Sin cuenta)"
                      : "Usuario Registrado"}
                  </p>
                </div>
              </div>
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p
                    className="text-sm text-gray-700 truncate"
                    title={pago.cliente.email}
                  >
                    {pago.cliente.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Teléfono</p>
                  <p className="text-sm text-gray-700">
                    {pago.cliente.telefono}
                  </p>
                </div>
              </div>
            </div>

            {/* IDs DE REFERENCIA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:hidden">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                IDs de Referencia
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Mercado Pago ID</p>
                  <div className="flex items-center justify-between">
                    <code
                      className="text-sm font-mono font-medium text-gray-800 truncate mr-2"
                      title={pago.mp_payment_id}
                    >
                      {pago.mp_payment_id}
                    </code>
                    <button
                      onClick={() => handleCopy(pago.mp_payment_id)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Copiar"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">ID Interno (DB)</p>
                  <code className="text-sm font-mono font-medium text-gray-800">
                    #{pago.id_pago}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
