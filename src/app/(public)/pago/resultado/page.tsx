"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Download,
  ArrowLeft,
  MapPin,
} from "lucide-react";
import jsPDF from "jspdf";

type Estado = "pendiente_pago" | "confirmada" | "expirada" | "rechazada";

type ReservaApi = {
  id_reserva: number;
  estado: Estado;
  expires_at?: string | null;
  confirmed_at?: string | null;

  id_club?: number;
  id_cancha?: number;

  fecha?: string | null;
  inicio?: string | null;
  fin?: string | null;
  fin_dia_offset?: 0 | 1 | null;

  precio_total?: number | null;
  anticipo_porcentaje?: number | null;
  monto_anticipo?: number | null;

  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  cliente_email?: string | null;

  club_nombre?: string | null;
  club_subdominio?: string | null;
  club_direccion?: string | null; // Agregado para el ticket
  cancha_nombre?: string | null;

  ultimo_pago?: {
    id_pago: number;
    status: string | null;
    mp_status: string | null;
    mp_status_detail: string | null;
    mp_payment_id: number | null;
    amount: number | null;
    currency: string | null;
    created_at: string | null;
  } | null;
};

// --- HELPERS ---
function isLocalHostName(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

function buildHostWithSubdomain(baseHost: string, club: string) {
  if (baseHost.startsWith(`${club}.`)) return baseHost;
  const host = baseHost.startsWith("www.") ? baseHost.slice(4) : baseHost;
  return `${club}.${host}`;
}

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

// --- PDF GENERATOR (Profesional) ---
function downloadPdfFromReserva(r: ReservaApi) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // Header Background
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 50, "F");

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

  // Club Info
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(r.club_nombre || "Club Deportivo", margin, 35);

  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(r.club_direccion || "Dirección no especificada", margin, 42);

  y = 65;

  // Estado Section
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("ESTADO DE LA RESERVA", margin, y);

  const statusColor = r.estado === "confirmada" ? [22, 163, 74] : [234, 179, 8];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 40, y - 5, 40, 8, 1, 1, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.text(
    (r.estado || "").toUpperCase().replace("_", " "),
    pageWidth - margin - 20,
    y,
    { align: "center" },
  );

  y += 15;

  // Helper for grid sections
  const drawSection = (
    title: string,
    data: (string | [string, string])[][],
    startY: number,
  ) => {
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
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

  const saldo = (r.precio_total || 0) - (r.monto_anticipo || 0);

  y = drawSection(
    "RESUMEN DE PAGO",
    [
      ["Precio Total", fmtMoney(r.precio_total)],
      ["Seña / Anticipo", fmtMoney(r.monto_anticipo)],
      ["Saldo Restante", fmtMoney(saldo)],
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
    "Este documento sirve como comprobante de la reserva realizada.\nPor políticas de cancelación, consulte directamente con la administración del club.";
  doc.text(footerText, pageWidth / 2, pageHeight - 20, { align: "center" });

  doc.save(`Reserva_${r.id_reserva}_${r.fecha}.pdf`);
}

export default function PagoResultadoPage() {
  const params = useSearchParams();
  const router = useRouter();

  const id_reserva = Number(params.get("id_reserva"));
  const club = params.get("club") || null;

  const [estado, setEstado] = useState<Estado | null>(null);
  const [reserva, setReserva] = useState<ReservaApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);

  const clubHomeUrl = useMemo(() => {
    if (!club) return null;
    if (typeof window === "undefined") return null;

    const protocolEnv = process.env.NEXT_PUBLIC_SITE_PROTOCOL || "https";
    const rootDomainEnv = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";

    const { protocol, hostname, port } = window.location;

    if (isLocalHostName(hostname)) {
      const targetHost = `${club}.localhost`;
      return `${protocol}//${targetHost}${port ? `:${port}` : ""}/`;
    }

    if (hostname.includes("ngrok-free.dev")) {
      return `${protocol}//${hostname}/?club=${encodeURIComponent(club)}`;
    }

    if (rootDomainEnv) {
      return `${protocolEnv}://${club}.${rootDomainEnv}/`;
    }

    const targetHost = buildHostWithSubdomain(hostname, club);
    return `${protocol}//${targetHost}${port ? `:${port}` : ""}/`;
  }, [club]);

  // Redirect Logic
  useEffect(() => {
    if (!club) return;
    if (typeof window === "undefined") return;

    const protocolEnv = process.env.NEXT_PUBLIC_SITE_PROTOCOL || "https";
    const rootDomainEnv = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";
    if (!rootDomainEnv) return;

    const { hostname, search } = window.location;

    if (isLocalHostName(hostname) || hostname.includes("ngrok-free.dev"))
      return;

    const expectedHost = `${club}.${rootDomainEnv}`;
    const alreadyOnClubHost = hostname === expectedHost;

    if (!alreadyOnClubHost) {
      const targetUrl = `${protocolEnv}://${expectedHost}/pago/resultado${search}`;
      window.location.replace(targetUrl);
    }
  }, [club]);

  // Polling Logic
  useEffect(() => {
    if (!id_reserva) return;

    let alive = true;
    let timer: any = null;

    async function poll() {
      try {
        setPollError(null);

        const res = await fetch(`/api/reservas/${id_reserva}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as ReservaApi | null;

        if (!alive) return;

        if (!res.ok || !data) {
          setPollError(
            (data as any)?.error || "No se pudo verificar el estado.",
          );
          setLoading(false);
          timer = setTimeout(poll, 2500);
          return;
        }

        setReserva(data);

        const nextEstado = (data.estado || null) as Estado | null;
        setEstado(nextEstado);
        setLoading(false);

        if (nextEstado === "pendiente_pago") {
          timer = setTimeout(poll, 2500);
        }
      } catch (e: any) {
        if (!alive) return;
        setPollError(e?.message || "Error de red verificando estado.");
        setLoading(false);
        timer = setTimeout(poll, 2500);
      }
    }

    poll();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [id_reserva]);

  if (!id_reserva) {
    return <p className="text-white p-10 text-center">Reserva inválida</p>;
  }

  const showPending = loading && !estado;

  return (
    <section className="min-h-screen flex items-center justify-center bg-[#09090b] text-white px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Loading State */}
        {showPending && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6 animate-pulse" />
            <h1 className="text-2xl font-bold mb-2">Verificando pago...</h1>
            <p className="text-zinc-400">
              Estamos consultando el estado de la operación con el proveedor.
            </p>
          </div>
        )}

        {/* Error State */}
        {!showPending && pollError && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
            <RotateCw className="w-16 h-16 text-zinc-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Estamos verificando</h1>
            <p className="text-zinc-400 mb-8">{pollError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 w-full py-3 rounded-xl font-bold transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Success State */}
        {!showPending && !pollError && estado === "confirmada" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex bg-emerald-500/10 p-4 rounded-full mb-4 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                ¡Reserva Exitosa!
              </h1>
              <p className="text-zinc-400">
                Tu turno ha sido confirmado correctamente.
              </p>
            </div>

            {/* Comprobante Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header Card */}
              <div className="bg-emerald-500/10 px-6 py-4 border-b border-emerald-500/20 flex justify-between items-center">
                <span className="text-emerald-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Confirmada
                </span>
                <span className="text-zinc-500 font-mono text-xs">
                  #{id_reserva.toString().padStart(6, "0")}
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* Info Principal */}
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white">
                    {reserva?.club_nombre}
                  </h2>
                  <p className="text-zinc-400 text-sm flex items-center justify-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {reserva?.cancha_nombre}
                  </p>
                </div>

                {/* Detalles Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-zinc-500 text-xs uppercase font-bold mb-1">
                      Fecha
                    </p>
                    <p className="font-semibold text-zinc-200">
                      {formatDate(reserva?.fecha)}
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-zinc-500 text-xs uppercase font-bold mb-1">
                      Horario
                    </p>
                    <p className="font-semibold text-zinc-200">
                      {reserva?.inicio?.slice(0, 5)} -{" "}
                      {reserva?.fin?.slice(0, 5)}
                    </p>
                  </div>
                </div>

                {/* Desglose Pago */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total</span>
                    <span className="font-medium text-white">
                      {fmtMoney(reserva?.precio_total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Pagado (Seña)</span>
                    <span className="font-medium text-emerald-400">
                      {fmtMoney(reserva?.monto_anticipo)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="bg-zinc-950 p-4 flex flex-col gap-3">
                <button
                  onClick={() => reserva && downloadPdfFromReserva(reserva)}
                  className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Descargar Comprobante
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push("/mis-reservas")}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-semibold transition-colors text-sm"
                  >
                    Mis Reservas
                  </button>
                  {clubHomeUrl && (
                    <button
                      onClick={() => (window.location.href = clubHomeUrl)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-semibold transition-colors text-sm"
                    >
                      Volver al Club
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending State */}
        {!showPending && !pollError && estado === "pendiente_pago" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Pago Pendiente</h1>
            <p className="text-zinc-400 mb-8">
              Tu pago está siendo procesado. Si ya pagaste, espera unos
              instantes.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-600 hover:bg-amber-700 text-white w-full py-3 rounded-xl font-bold transition-colors"
            >
              Actualizar Estado
            </button>
          </div>
        )}

        {/* Rejected/Expired State */}
        {!showPending &&
          !pollError &&
          (estado === "rechazada" || estado === "expirada") && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h1 className="text-2xl font-bold mb-2">
                {estado === "rechazada" ? "Pago Rechazado" : "Reserva Expirada"}
              </h1>
              <p className="text-zinc-400 mb-8">
                {estado === "rechazada"
                  ? "El pago no pudo completarse. Por favor intenta con otro medio."
                  : "El tiempo para realizar el pago ha finalizado."}
              </p>
              <button
                onClick={() => router.push("/reserva")}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-xl font-bold transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
      </div>
    </section>
  );
}
