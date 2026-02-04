"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Printer, Loader2, Share2 } from "lucide-react";

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
  // ✅ Nuevo Objeto Club Dinámico
  club: {
    nombre: string;
    direccion: string;
    telefono: string;
  };
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

// --- HELPERS DE FORMATO ---
const money = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);

// --- COMPONENTES VISUALES TICKET ---
const TicketDivider = () => (
  <div className="w-full border-b-2 border-dashed border-gray-300 my-3" />
);

const TicketRow = ({ label, value, bold = false, size = "sm" }: any) => (
  <div
    className={`flex justify-between items-start ${size === "xs" ? "text-[10px]" : "text-xs"} mb-1`}
  >
    <span className="text-gray-500 uppercase">{label}</span>
    <span
      className={`text-right text-black ${bold ? "font-bold" : "font-medium"}`}
    >
      {value}
    </span>
  </div>
);

export default function DetallePagoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [pago, setPago] = useState<PagoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/pagos/${id}`);
        if (!res.ok) throw new Error("Error al cargar el pago");
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

  const handlePrint = () => {
    window.print();
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );

  if (error || !pago)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 text-red-500">
        Error: {error}
      </div>
    );

  // --- VARIABLES DERIVADAS ---
  const fecha = new Date(pago.created_at).toLocaleDateString("es-AR");
  const hora = new Date(pago.created_at).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isWeb = pago.provider === "mercadopago";
  const cajero = isWeb ? "SISTEMA WEB" : "CAJA ADMINISTRACIÓN";
  const metodoLabel =
    pago.method === "account_money"
      ? "Dinero en Cuenta"
      : pago.method === "credit_card" || pago.method === "debit_card"
        ? `Tarjeta ${pago.card_last4 ? "•••• " + pago.card_last4 : ""}`
        : "Efectivo / Otro";

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex flex-col items-center font-sans">
      {/* --- ESTILOS DE IMPRESIÓN (Inyectados) --- */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            background: white;
          }
          body * {
            visibility: hidden;
          }
          #ticket-container,
          #ticket-container * {
            visibility: visible;
          }
          #ticket-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: none;
            background: white;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* --- NAV SUPERIOR (No se imprime) --- */}
      <div className="w-full max-w-sm mb-6 flex items-center justify-between no-print">
        <Link
          href="/admin/pagos"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Volver
        </Link>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" /> IMPRIMIR
          </button>
        </div>
      </div>

      {/* --- EL TICKET (Visible e Imprimible) --- */}
      <div
        id="ticket-container"
        className="bg-white w-full max-w-[320px] p-6 shadow-2xl relative font-mono text-black leading-snug border border-gray-200 text-[11px]"
        style={{
          clipPath:
            "polygon(0 0, 100% 0, 100% 99%, 98% 100%, 96% 99%, 94% 100%, 92% 99%, 90% 100%, 88% 99%, 86% 100%, 84% 99%, 82% 100%, 80% 99%, 78% 100%, 76% 99%, 74% 100%, 72% 99%, 70% 100%, 68% 99%, 66% 100%, 64% 99%, 62% 100%, 60% 99%, 58% 100%, 56% 99%, 54% 100%, 52% 99%, 50% 100%, 48% 99%, 46% 100%, 44% 99%, 42% 100%, 40% 99%, 38% 100%, 36% 99%, 34% 100%, 32% 99%, 30% 100%, 28% 99%, 26% 100%, 24% 99%, 22% 100%, 20% 99%, 18% 100%, 16% 99%, 14% 100%, 12% 99%, 10% 100%, 8% 99%, 6% 100%, 4% 99%, 2% 100%, 0 99%)",
        }}
      >
        {/* 1. ENCABEZADO CLUB (DINÁMICO) */}
        <div className="text-center mb-4">
          <h1 className="text-base font-bold uppercase mb-1">
            {pago.club.nombre}
          </h1>
          <p className="text-[10px] uppercase">{pago.club.direccion}</p>
          {pago.club.telefono && (
            <p className="text-[10px]">Tel: {pago.club.telefono}</p>
          )}
        </div>

        <TicketDivider />

        {/* 2. DATOS DEL RECIBO */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>FECHA:</span>
            <span>
              {fecha} {hora}
            </span>
          </div>
          <div className="flex justify-between">
            <span>RECIBO N°:</span>
            <span className="font-bold">
              #{pago.id_pago.toString().padStart(6, "0")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>CAJERO:</span>
            <span className="uppercase">{cajero}</span>
          </div>
        </div>

        <TicketDivider />

        {/* 3. CLIENTE */}
        <div className="mb-3">
          <p className="text-[10px] mb-1">RECIBIMOS DE:</p>
          <p className="font-bold text-sm uppercase truncate">
            {pago.cliente.nombre} {pago.cliente.apellido}
          </p>
          {pago.cliente.telefono &&
            pago.cliente.telefono !== "No especificado" && (
              <p className="text-[10px]">Tel: {pago.cliente.telefono}</p>
            )}
        </div>

        <TicketDivider />

        {/* 4. CONCEPTO (Reserva) */}
        <div className="mb-2">
          <div className="flex justify-between font-bold mb-1">
            <span>CONCEPTO</span>
            <span>IMPORTE</span>
          </div>
          <div className="flex justify-between items-start">
            <div className="pr-2">
              <p>ALQUILER CANCHA</p>
              <p className="text-[9px] text-gray-600">
                {pago.reserva.cancha} | {pago.reserva.fecha}
              </p>
              <p className="text-[9px] text-gray-600">
                Turno: {pago.reserva.inicio?.slice(0, 5)} -{" "}
                {pago.reserva.fin?.slice(0, 5)}
              </p>
            </div>
            <span>{money(pago.amount)}</span>
          </div>
        </div>

        <div className="border-t border-black my-3" />

        {/* 5. TOTALES */}
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold">TOTAL PAGADO</span>
          <span className="text-xl font-bold">{money(pago.amount)}</span>
        </div>

        <div className="text-[10px] space-y-1 text-right">
          <p>
            FORMA DE PAGO:{" "}
            <span className="font-bold uppercase">{metodoLabel}</span>
          </p>
          {pago.mp_payment_id && pago.mp_payment_id !== "N/A" && (
            <p>REF EXT: {pago.mp_payment_id}</p>
          )}
        </div>

        {/* 6. CAJA DE ESTADO */}
        <div className="mt-6 border-2 border-black p-2 text-center">
          <p className="text-[9px] mb-1">ESTADO DE LA OPERACIÓN</p>
          <p className="text-base font-bold uppercase">
            {pago.status === "approved" ? "APROBADA" : pago.status}
          </p>
        </div>

        {/* 7. PIE */}
        <div className="text-center mt-6 text-[9px] text-gray-600">
          <p>¡GRACIAS POR ELEGIRNOS!</p>
          <p className="mt-1">Comprobante no válido como factura fiscal.</p>
          <p className="mt-4 text-[8px] text-gray-400">Powered by Versori</p>
        </div>
      </div>
    </div>
  );
}
