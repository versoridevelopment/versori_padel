"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Printer,
  ArrowLeft,
  MapPin,
} from "lucide-react";

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
  club_direccion?: string | null; // ✅ Necesario para el ticket
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
  // Asumiendo formato YYYY-MM-DD
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

// --- GENERADOR DE TICKET (HTML Print) ---
function printTicket(r: ReservaApi) {
  const printWindow = window.open("", "PRINT", "height=650,width=450");

  if (printWindow) {
    const fechaImpresion = new Date().toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Cálculos
    const total = r.precio_total || 0;
    const pagado = r.monto_anticipo || 0; // O r.ultimo_pago.amount si prefieres lo real pagado
    const saldo = total - pagado;

    // Horario
    const horarioDisplay = `${r.inicio?.slice(0, 5)} - ${r.fin?.slice(0, 5)}${r.fin_dia_offset ? " (+1)" : ""}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket #${r.id_reserva}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
            body { font-family: 'Roboto Mono', monospace; padding: 15px; margin: 0; background: #fff; color: #000; font-size: 12px; }
            .ticket { width: 100%; max-width: 300px; margin: 0 auto; }
            @media print { @page { margin: 0; } body { padding: 0; } button { display: none; } }
            .text-center { text-align: center; } 
            .text-right { text-align: right; } 
            .font-bold { font-weight: 700; }
            .text-lg { font-size: 16px; } 
            .text-xl { font-size: 18px; } 
            .uppercase { text-transform: uppercase; }
            .divider { border-top: 1px dashed #000; margin: 12px 0; }
            .double-divider { border-top: 3px double #000; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .box { border: 2px solid #000; padding: 8px; margin: 15px 0; text-align: center; }
            
            /* Header Club */
            .club-header { margin-bottom: 15px; }
            .club-name { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
            .club-address { font-size: 10px; color: #444; }
          </style>
        </head>
        <body>
          <div class="ticket">
            
            <div class="text-center club-header">
              <div class="club-name">${r.club_nombre || "Club Deportivo"}</div>
              <div class="club-address">${r.club_direccion || "Dirección no disponible"}</div>
            </div>

            <div class="divider"></div>

            <div class="text-center">
              <div class="font-bold text-xl uppercase">COMPROBANTE</div>
              <div style="font-size: 14px; margin-top: 4px;">Reserva #${r.id_reserva}</div>
              <div style="font-size: 10px; margin-top: 4px;">${fechaImpresion}</div>
            </div>

            <div class="double-divider"></div>

            <div class="row"><span>CLIENTE:</span><span class="font-bold text-right">${r.cliente_nombre || "Consumidor Final"}</span></div>
            <div class="row"><span>CANCHA:</span><span class="text-right">${r.cancha_nombre || "-"}</span></div>
            <div class="row"><span>FECHA:</span><span class="text-right">${formatDate(r.fecha)}</span></div>
            <div class="row"><span>HORARIO:</span><span class="font-bold text-right">${horarioDisplay}</span></div>
            
            <div class="divider"></div>
            
            <div class="row"><span>Concepto</span><span class="text-right">Alquiler Cancha</span></div>
            <div class="row font-bold text-lg" style="margin-top: 8px;"><span>TOTAL:</span><span>${fmtMoney(total)}</span></div>
            
            <div class="divider"></div>
            
            <div class="row"><span>Pagado / Seña:</span><span>${fmtMoney(pagado)}</span></div>
            
            <div class="box">
              <div style="font-size: 10px; margin-bottom: 4px;">SALDO PENDIENTE</div>
              <div class="font-bold text-xl">${fmtMoney(saldo)}</div>
            </div>

            <div class="text-center" style="margin-top: 25px; font-size: 10px; color: #666;">
              <p style="margin:4px 0;">GRACIAS POR SU VISITA</p>
              <p style="margin:4px 0;">No válido como factura fiscal.</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
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
                  onClick={() => reserva && printTicket(reserva)}
                  className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Imprimir Comprobante
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
