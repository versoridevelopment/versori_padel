import PDFDocument from "pdfkit";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

function buildPdfBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    build(doc);
    doc.end();
  });
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n || 0);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const id_reserva = Number(id);

    if (!id_reserva || Number.isNaN(id_reserva)) {
      return Response.json({ error: "id inválido" }, { status: 400 });
    }

    const { data: r, error } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        id_reserva,
        id_club,
        id_cancha,
        fecha,
        inicio,
        fin,
        fin_dia_offset,
        estado,
        precio_total,
        anticipo_porcentaje,
        monto_anticipo,
        confirmed_at,
        created_at,
        cliente_nombre,
        cliente_telefono,
        cliente_email,
        clubes:clubes ( nombre, subdominio ),
        canchas:canchas ( nombre )
      `
      )
      .eq("id_reserva", id_reserva)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!r) {
      return Response.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    if (r.estado !== "confirmada") {
      return Response.json(
        { error: `La reserva no está confirmada (estado=${r.estado})` },
        { status: 409 }
      );
    }

    const clubNombre = (r as any)?.clubes?.nombre ?? "Club";
    const clubSub = (r as any)?.clubes?.subdominio ?? "";
    const canchaNombre = (r as any)?.canchas?.nombre ?? `Cancha #${r.id_cancha}`;

    const pdfBuffer = await buildPdfBuffer((doc) => {
      doc.fontSize(18).text("Comprobante de Reserva", { align: "center" });
      doc.moveDown(1);

      doc.fontSize(11);

      doc.text(`Reserva N°: ${r.id_reserva}`);
      doc.text(`Club: ${clubNombre}${clubSub ? ` (${clubSub})` : ""}`);
      doc.text(`Cancha: ${canchaNombre}`);
      doc.text(`Fecha: ${r.fecha}`);
      doc.text(
        `Horario: ${r.inicio} - ${r.fin}${r.fin_dia_offset === 1 ? " (+1 día)" : ""}`
      );
      doc.text(`Estado: ${r.estado}`);
      doc.moveDown(0.5);

      doc.text(`Total: ${fmtMoney(Number(r.precio_total || 0))}`);
      doc.text(`Anticipo: ${fmtMoney(Number(r.monto_anticipo || 0))}`);
      doc.text(`Anticipo (%): ${Number(r.anticipo_porcentaje ?? 0)}%`);

      if (r.confirmed_at) doc.text(`Confirmada: ${String(r.confirmed_at)}`);

      doc.moveDown(1);
      doc.text("Datos del cliente", { underline: true });
      doc.moveDown(0.4);
      doc.text(`Nombre: ${r.cliente_nombre ?? "-"}`);
      doc.text(`Teléfono: ${r.cliente_telefono ?? "-"}`);
      doc.text(`Email: ${r.cliente_email ?? "-"}`);

      doc.moveDown(2);
      doc.fontSize(9).fillColor("gray").text(
        "Este comprobante es válido como constancia de la reserva registrada en el sistema.",
        { align: "center" }
      );
    });

    const filename = `comprobante-reserva-${id_reserva}.pdf`;

    // Importante: convertir Buffer -> Uint8Array para que sea BodyInit válido
    const body = new Uint8Array(pdfBuffer);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[GET /api/reservas/:id/comprobante] ex:", e);
    return Response.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
