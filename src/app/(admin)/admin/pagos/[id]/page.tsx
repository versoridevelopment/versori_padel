"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CreditCard,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Printer,
  RotateCcw,
  FileJson,
} from "lucide-react";

// --- TIPOS (Mapeo DB) ---
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
  raw: any;
};

function StatusBadgeLarge({ status }: { status: string }) {
  const styles = {
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    in_process: "bg-amber-100 text-amber-800 border-amber-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    refunded: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const icons = {
    approved: CheckCircle2,
    in_process: AlertCircle,
    rejected: XCircle,
    refunded: RotateCcw,
  };

  const style = styles[status as keyof typeof styles] || styles.in_process;
  const Icon = icons[status as keyof typeof icons] || AlertCircle;

  const label =
    status === "approved"
      ? "Aprobado"
      : status === "rejected"
      ? "Rechazado"
      : status === "in_process"
      ? "En revisión"
      : status;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${style} w-fit`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-semibold text-sm uppercase tracking-wide">
        {label}
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
  const { id } = use(params); // ✅ Next 15: params es Promise
  const [loading, setLoading] = useState(true);
  const [pago, setPago] = useState<PagoDetalle | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // En producción: fetch(`/api/admin/pagos/${id}`)
      // Mock:
      await new Promise((r) => setTimeout(r, 500));

      setPago({
        id_pago: Number(id) || 1024,
        provider: "mercadopago",
        status: "approved",
        status_detail: "accredited",
        amount: 7500,
        currency: "ARS",
        mp_payment_id: "5829102938",
        created_at: "2025-10-20T14:30:00",
        approved_at: "2025-10-20T14:30:05",
        method: "credit_card",
        card_last4: "4242",
        cliente: {
          id_usuario: "u-123",
          nombre: "Neil",
          apellido: "Sims",
          email: "neil.sims@example.com",
          telefono: "+54 9 11 1234 5678",
        },
        reserva: {
          id_reserva: 885,
          fecha: "2025-10-22",
          inicio: "19:00",
          fin: "20:30",
          cancha: "Cancha 3 (Panorámica)",
          precio_total_reserva: 15000,
        },
        raw: {
          payment_method_id: "visa",
          payment_type_id: "credit_card",
          status_detail: "accredited",
          description: "Reserva Cancha 3 - Versori",
        },
      });

      setLoading(false);
    }

    load();
  }, [id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        Cargando detalles de la transacción...
      </div>
    );

  if (!pago)
    return (
      <div className="p-10 text-center text-red-500">No se encontró el pago.</div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/pagos"
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 transition-all"
            aria-label="Volver al listado de pagos"
            title="Volver atrás"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Pago #{pago.id_pago}
              <span className="text-sm font-normal text-gray-400 font-mono">
                MP: {pago.mp_payment_id}
              </span>
            </h1>
          </div>

          <div className="ml-auto flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            {pago.status === "approved" && (
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors shadow-sm">
                <RotateCcw className="w-4 h-4" />
                <span>Reembolsar</span>
              </button>
            )}
          </div>
        </div>

        {/* ... el resto de tu UI exactamente igual ... */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

              {/* ... etc ... */}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors list-none">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileJson className="w-4 h-4 text-gray-400" />
                    Datos técnicos (Mercado Pago Raw)
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400 transition-transform group-open:-rotate-90" />
                </summary>
                <div className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
                  <pre>{JSON.stringify(pago.raw, null, 2)}</pre>
                </div>
              </details>
            </div>
          </div>

          <div className="space-y-6">
            {/* ... sidebar ... */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">
                IDs de Referencia
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Mercado Pago ID</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono font-medium text-gray-800">
                      {pago.mp_payment_id}
                    </code>
                    <button
                      onClick={() => handleCopy(pago.mp_payment_id)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Copiar ID"
                      aria-label="Copiar ID Mercado Pago"
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
