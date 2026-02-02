"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import jsPDF from "jspdf";

type Estado =
  | "pendiente_pago"
  | "confirmada"
  | "expirada"
  | "rechazada"
  | "cancelada";

type Detalle = {
  id_reserva: number;
  estado: Estado;
  confirmed_at?: string | null;
  created_at?: string | null;

  fecha?: string | null;
  inicio?: string | null;
  fin?: string | null;
  fin_dia_offset?: 0 | 1 | null;

  precio_total?: number | null;
  anticipo_porcentaje?: number | null;
  monto_anticipo?: number | null;

  club_nombre?: string | null;
  club_direccion?: string | null; // Nuevo campo para dirección del club
  cancha_nombre?: string | null;

  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  cliente_email?: string | null;

  ultimo_pago?: {
    mp_status: string | null;
    mp_payment_id: number | null;
    amount: number | null;
    currency: string | null;
  } | null;
};

// --- HELPERS ---
function fmtMoney(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(v);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// --- GENERADOR DE PDF ---
function downloadPdf(r: Detalle) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // Header Background
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 50, "F"); // Increased height for club info

  // Title
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("COMPROBANTE DE RESERVA", margin, 25);

  // ID
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(
    `ID: #${r.id_reserva.toString().padStart(6, "0")}`,
    pageWidth - margin,
    25,
    { align: "right" },
  );

  // Club Info in Header
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(r.club_nombre || "Club Deportivo", margin, 35);

  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(r.club_direccion || "Dirección no especificada", margin, 42);

  y = 65;

  // Estado Section
  doc.setFontSize(12);
  doc.setTextColor(100); // Gray text for label
  doc.text("ESTADO DE LA RESERVA", margin, y);

  const statusColor = r.estado === "confirmada" ? [22, 163, 74] : [234, 179, 8]; // Green or Yellow
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 40, y - 5, 40, 8, 1, 1, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.text(
    r.estado.toUpperCase().replace("_", " "),
    pageWidth - margin - 20,
    y,
    { align: "center" },
  );

  y += 15;

  // Helper to draw sections
  const drawSection = (
    title: string,
    data: (string | [string, string])[][],
    startY: number,
  ) => {
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Dark text
    doc.text(title, margin, startY);
    doc.setDrawColor(200);
    doc.line(margin, startY + 2, pageWidth - margin, startY + 2);

    let currentY = startY + 12;
    doc.setFontSize(10);

    data.forEach((item) => {
      const label = item[0] as string;
      const value = item[1] as string;

      doc.setTextColor(100);
      doc.text(label, margin, currentY);
      doc.setTextColor(0);
      doc.text(value, margin + 40, currentY);
      currentY += 8;
    });
    return currentY + 10;
  };

  y = drawSection(
    "DETALLES DEL TURNO",
    [
      ["Cancha", r.cancha_nombre || "-"],
      ["Fecha", formatDate(r.fecha)],
      [
        "Horario",
        `${r.inicio?.slice(0, 5)} - ${r.fin?.slice(0, 5)}${r.fin_dia_offset ? " (+1)" : ""}`,
      ],
    ],
    y,
  );

  y = drawSection(
    "DATOS DEL CLIENTE",
    [
      ["Nombre", r.cliente_nombre || "-"],
      ["Teléfono", r.cliente_telefono || "-"],
      ["Email", r.cliente_email || "-"],
    ],
    y,
  );

  y = drawSection(
    "RESUMEN DE PAGO",
    [
      ["Precio Total", fmtMoney(r.precio_total)],
      ["Seña / Anticipo", fmtMoney(r.monto_anticipo)],
      [
        "Saldo Restante",
        fmtMoney((r.precio_total || 0) - (r.monto_anticipo || 0)),
      ],
    ],
    y,
  );

  if (r.ultimo_pago) {
    y = drawSection(
      "DETALLE TRANSACCIÓN",
      [
        ["ID Pago MP", r.ultimo_pago.mp_payment_id?.toString() || "-"],
        ["Estado MP", r.ultimo_pago.mp_status?.toUpperCase() || "-"],
      ],
      y,
    );
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  const footerText =
    "Este documento sirve como comprobante de la reserva realizada. Preséntelo en el club al momento de ingresar.\nPor políticas de cancelación, consulte directamente con la administración del club.";
  doc.text(footerText, pageWidth / 2, pageHeight - 20, { align: "center" });

  doc.save(`Reserva_${r.id_reserva}_${r.fecha}.pdf`);
}

// --- COMPONENTE PRINCIPAL ---
export default function ReservaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const id_reserva = Number(id);

  const [data, setData] = useState<Detalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id_reserva) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reservas/${id_reserva}/detalle`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("No se pudo cargar la reserva");
        const json = await res.json();

        // Simulamos obtener dirección si no viene del backend (ajustar según tu API real)
        // json.club_direccion = json.club_direccion || "Dirección del Club";

        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id_reserva]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 p-4 rounded-full mb-4">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Error al cargar</h1>
        <p className="text-zinc-400 mb-6">{error}</p>
        <button
          onClick={() => router.push("/mis-reservas")}
          className="text-white bg-zinc-800 px-6 py-2 rounded-lg hover:bg-zinc-700"
        >
          Volver
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 font-sans pt-24 md:pt-32">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Nav */}
        <button
          onClick={() => router.push("/mis-reservas")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Mis Reservas
        </button>

        {/* Card Principal */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Status Banner */}
          <div
            className={`px-6 py-4 flex items-center justify-between border-b border-zinc-800 ${
              data.estado === "confirmada"
                ? "bg-emerald-500/10"
                : data.estado === "pendiente_pago"
                  ? "bg-amber-500/10"
                  : "bg-red-500/10"
            }`}
          >
            <div className="flex items-center gap-3">
              {data.estado === "confirmada" && (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              )}
              {data.estado === "pendiente_pago" && (
                <Clock className="w-6 h-6 text-amber-500" />
              )}
              {(data.estado === "cancelada" || data.estado === "rechazada") && (
                <XCircle className="w-6 h-6 text-red-500" />
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Estado
                </p>
                <p
                  className={`font-bold capitalize ${
                    data.estado === "confirmada"
                      ? "text-emerald-400"
                      : data.estado === "pendiente_pago"
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {data.estado.replace("_", " ")}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 font-mono">
                #{data.id_reserva.toString().padStart(6, "0")}
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Info Principal */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-white">
                {data.club_nombre}
              </h2>
              <p className="text-zinc-400 flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" /> {data.cancha_nombre}
              </p>
            </div>

            {/* Grid de Detalles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Calendar className="w-4 h-4" />{" "}
                  <span className="text-xs font-bold uppercase">Fecha</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatDate(data.fecha)}
                </p>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                  <Clock className="w-4 h-4" />{" "}
                  <span className="text-xs font-bold uppercase">Horario</span>
                </div>
                <p className="text-lg font-semibold">
                  {data.inicio?.slice(0, 5)} - {data.fin?.slice(0, 5)}
                </p>
              </div>
            </div>

            {/* Desglose de Pago */}
            <div className="space-y-3 pt-4 border-t border-zinc-800/50">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Detalles del Pago
              </h3>

              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Precio Total</span>
                <span className="font-medium text-white">
                  {fmtMoney(data.precio_total)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Seña / Anticipo</span>
                <span className="font-medium text-emerald-400">
                  {fmtMoney(data.monto_anticipo)}
                </span>
              </div>

              <div className="border-t border-zinc-800 my-2"></div>

              <div className="flex justify-between text-base font-bold">
                <span className="text-white">Saldo a pagar en el club</span>
                <span className="text-white">
                  {fmtMoney(
                    (data.precio_total || 0) - (data.monto_anticipo || 0),
                  )}
                </span>
              </div>
            </div>

            {/* Info Adicional / Pago MP */}
            {data.ultimo_pago && (
              <div className="bg-zinc-800/30 p-4 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Transacción MP:</span>
                  <span className="font-mono text-zinc-300">
                    {data.ultimo_pago.mp_payment_id}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Estado pago:</span>
                  <span className="font-mono text-zinc-300">
                    {data.ultimo_pago.mp_status}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-zinc-950 p-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => downloadPdf(data)}
              className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
            <button
              onClick={() => router.push("/mis-reservas")}
              className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Mis Reservas
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 px-6">
          Presenta este comprobante en la recepción del club al momento de tu
          llegada.
        </p>
      </div>
    </div>
  );
}
