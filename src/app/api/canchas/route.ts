// src/app/api/canchas/route.ts
import { NextResponse } from "next/server";
import { getCanchasBySubdomain } from "@/lib/canchas/getCanchasBySubdomain";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const subdominio = searchParams.get("subdominio");
    const deporte = searchParams.get("deporte");
    const tipo = searchParams.get("tipo");

    if (!subdominio) {
      return NextResponse.json(
        { error: "subdominio es requerido" },
        { status: 400 }
      );
    }

    const canchas = await getCanchasBySubdomain(subdominio, {
      deporte,
      tipo,
    });

    return NextResponse.json(canchas);
  } catch (err: any) {
    console.error("[API /canchas] ex:", err);
    const message =
      err instanceof Error ? err.message : "Error al obtener canchas";
    const status = message.includes("Club no encontrado") ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
