// src/lib/canchas/getCanchasBySubdomain.ts
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export type CanchaDetalle = {
  id_cancha: number;
  id_club: number;
  nombre: string;
  descripcion: string | null;
  precio_hora: number;
  imagen_url: string | null;
  es_exterior: boolean;
  activa: boolean;
  estado: boolean;
  tipo_nombre: string;
  capacidad_jugadores: number | null;
  superficie: string | null;
  id_deporte: number;
  deporte_nombre: string;
};

export async function getCanchasBySubdomain(
  subdominio: string,
  opts?: { deporte?: string | null; tipo?: string | null }
): Promise<CanchaDetalle[]> {
  const deporte = opts?.deporte ?? null;
  const tipo = opts?.tipo ?? null;

  // 1) Buscar club por subdominio
  const { data: club, error: clubError } = await supabaseAdmin
    .from("clubes")
    .select("id_club")
    .eq("subdominio", subdominio)
    .single();

  if (clubError || !club) {
    throw new Error("Club no encontrado");
  }

  // 2) Query sobre la VIEW: solo canchas vigentes (estado=true) y operativas (activa=true)
  let query = supabaseAdmin
    .from("v_canchas_detalle")
    .select(
      "id_cancha, id_club, nombre, descripcion, precio_hora, imagen_url, es_exterior, activa, estado, tipo_nombre, capacidad_jugadores, superficie, id_deporte, deporte_nombre"
    )
    .eq("id_club", club.id_club)
    .eq("estado", true)
    .eq("activa", true);

  if (deporte) {
    query = query.eq("deporte_nombre", deporte);
  }

  if (tipo) {
    query = query.eq("tipo_nombre", tipo);
  }

  const { data: canchas, error } = await query.order("id_cancha", {
    ascending: true,
  });

  if (error) {
    console.error("[getCanchasBySubdomain] error:", error);
    throw new Error("Error al obtener canchas");
  }

  return (canchas ?? []) as CanchaDetalle[];
}
