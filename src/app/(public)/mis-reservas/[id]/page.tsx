"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, CheckCircle2, Clock, XCircle } from "lucide-react";
import jsPDF from "jspdf";

type Estado = "pendiente_pago" | "confirmada" | "expirada" | "rechazada";

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

function fmtMoney(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "-";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v);
}

function downloadPdf(r: Detalle) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  doc.setFontSize(18);
  doc.text("Comprobante de Reserva", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  const labelValue = (xL: number, xV: number, yy: number, label: string, value: string) => {
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(label, xL, yy);
    doc.setTextColor(20);
    doc.text(value || "-", xV, yy);
  };

  const boxX = margin;
  const boxW = pageW - margin * 2;
  const boxH = 74;

  doc.setDrawColor(200);
  doc.roundedRect(boxX, y, boxW, boxH, 3, 3);

  const leftL = boxX + 6;
  const leftV = boxX + 42;
  const rightL = boxX + boxW / 2 + 6;
  const rightV = boxX + boxW / 2 + 42;

  let rowY = y + 10;

  labelValue(leftL, leftV, rowY, "Reserva", `#${String(r.id_reserva)}`);
  labelValue(rightL, rightV, rowY, "Estado", (r.estado ?? "-").toUpperCase());
  rowY += 10;

  labelValue(leftL, leftV, rowY, "Club", r.club_nombre ?? "-");
  labelValue(rightL, rightV, rowY, "Cancha", r.cancha_nombre ?? "-");
  rowY += 10;

  labelValue(leftL, leftV, rowY, "Fecha", r.fecha ?? "-");
  labelValue(
    rightL,
    rightV,
    rowY,
    "Horario",
    `${r.inicio ?? "-"} - ${r.fin ?? "-"}${r.fin_dia_offset === 1 ? " (+1)" : ""}`
  );
  rowY += 10;

  labelValue(leftL, leftV, rowY, "Total", fmtMoney(r.precio_total));
  labelValue(rightL, rightV, rowY, "Anticipo", fmtMoney(r.monto_anticipo));
  rowY += 10;

  labelValue(leftL, leftV, rowY, "Confirmada", r.confirmed_at ? String(r.confirmed_at) : "-");

  y += boxH + 10;

  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Datos del cliente", margin, y);
  y += 6;

  const cBoxH = 28;
  doc.setDrawColor(200);
  doc.roundedRect(boxX, y, boxW, cBoxH, 3, 3);

  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text("Nombre", leftL, y + 10);
  doc.setTextColor(20);
  doc.text(r.cliente_nombre ?? "-", leftV, y + 10);

  doc.setTextColor(90);
  doc.text("Teléfono", rightL, y + 10);
  doc.setTextColor(20);
  doc.text(r.cliente_telefono ?? "-", rightV, y + 10);

  doc.setTextColor(90);
  doc.text("Email", leftL, y + 20);
  doc.setTextColor(20);
  doc.text(r.cliente_email ?? "-", leftV, y + 20);

  y += cBoxH + 12;

  if (r.ultimo_pago) {
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Pago", margin, y);
    y += 6;

    const pBoxH = 24;
    doc.setDrawColor(200);
    doc.roundedRect(boxX, y, boxW, pBoxH, 3, 3);

    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text("MP status", leftL, y + 10);
    doc.setTextColor(20);
    doc.text(r.ultimo_pago.mp_status ?? "-", leftV, y + 10);

    doc.setTextColor(90);
    doc.text("Payment ID", rightL, y + 10);
    doc.setTextColor(20);
    doc.text(String(r.ultimo_pago.mp_payment_id ?? "-"), rightV, y + 10);

    y += pBoxH + 10;
  }

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    "Este comprobante es una constancia de la reserva registrada en el sistema.",
    pageW / 2,
    285,
    { align: "center" }
  );

  doc.save(`comprobante-reserva-${r.id_reserva}.pdf`);
}

export default function ReservaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const id_reserva = Number(id);

  const [data, setData] = useState<Detalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id_reserva) return;

    let alive = true;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/reservas/${id_reserva}/detalle`, { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok) {
          setErr(json?.error || "No se pudo cargar el detalle.");
          setData(null);
          setLoading(false);
          return;
        }

        setData(json as Detalle);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Error de red.");
        setData(null);
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id_reserva]);

  if (!id_reserva) return <div className="p-10 text-white">Reserva inválida</div>;

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push("/mis-reservas")}
          className="inline-flex items-center gap-2 mb-6 bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 rounded-xl font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        {loading && (
          <div className="bg-[#0b2545] border border-[#1b4e89] rounded-2xl p-6 text-center">
            Cargando comprobante…
          </div>
        )}

        {!loading && err && (
          <div className="bg-[#0b2545] border border-rose-500/40 rounded-2xl p-6 text-center">
            <p className="text-rose-200 font-semibold mb-2">Error</p>
            <p className="text-neutral-200">{err}</p>
          </div>
        )}

        {!loading && !err && data && (
          <div className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Reserva #{data.id_reserva}</h1>
                <p className="text-neutral-300 mt-1">
                  {data.club_nombre ?? "Club"} · {data.cancha_nombre ?? "Cancha"}
                </p>
              </div>

              {data.estado === "confirmada" ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              ) : data.estado === "pendiente_pago" ? (
                <Clock className="w-10 h-10 text-yellow-400" />
              ) : (
                <XCircle className="w-10 h-10 text-rose-400" />
              )}
            </div>

            <div className="mt-6 bg-[#071b33] border border-white/10 rounded-2xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-neutral-200">
                <div className="flex justify-between gap-4">
                  <span className="text-neutral-400">Estado</span>
                  <span className="font-semibold">{data.estado}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-neutral-400">Fecha</span>
                  <span>{data.fecha ?? "-"}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-neutral-400">Horario</span>
                  <span>
                    {data.inicio ?? "-"} - {data.fin ?? "-"}
                    {data.fin_dia_offset === 1 ? " (+1)" : ""}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-neutral-400">Total</span>
                  <span>{fmtMoney(data.precio_total)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-neutral-400">Anticipo</span>
                  <span>{fmtMoney(data.monto_anticipo)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-neutral-400">Confirmada</span>
                  <span>{data.confirmed_at ? String(data.confirmed_at) : "-"}</span>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-white/10">
                <p className="font-semibold text-neutral-100 mb-2">Cliente</p>
                <div className="text-sm text-neutral-200 space-y-1">
                  <div>{data.cliente_nombre ?? "-"}</div>
                  <div>{data.cliente_telefono ?? "-"}</div>
                  <div>{data.cliente_email ?? "-"}</div>
                </div>
              </div>

              {data.ultimo_pago && (
                <div className="mt-5 pt-5 border-t border-white/10">
                  <p className="font-semibold text-neutral-100 mb-2">Pago</p>
                  <div className="text-sm text-neutral-200 space-y-1">
                    <div>
                      <span className="text-neutral-400">MP status:</span>{" "}
                      {data.ultimo_pago.mp_status ?? "-"}
                    </div>
                    <div>
                      <span className="text-neutral-400">Payment ID:</span>{" "}
                      {data.ultimo_pago.mp_payment_id ?? "-"}
                    </div>
                    <div>
                      <span className="text-neutral-400">Monto:</span>{" "}
                      {fmtMoney(data.ultimo_pago.amount)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col md:flex-row gap-3">
              <button
                onClick={() => downloadPdf(data)}
                className="bg-white/10 hover:bg-white/15 border border-white/10 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Descargar comprobante (PDF)
              </button>

              <button
                onClick={() => router.push("/mis-reservas")}
                className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-xl font-semibold"
              >
                Ver todas mis reservas
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
