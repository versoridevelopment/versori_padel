import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ nombre: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { nombre } = await params;
    const { searchParams } = new URL(req.url);
    const id_club = searchParams.get("id_club");

    // Decodificar y limpiar espacios
    const decodedName = decodeURIComponent(nombre).trim();

    if (!id_club)
      return NextResponse.json({ error: "Falta id_club" }, { status: 400 });

    // ----------------------------------------------------------------------
    // PASO 1: Buscar Reservas
    // (Sin JOINs a profiles para evitar el error 500)
    // (Sin updated_at porque no existe en tu tabla)
    // ----------------------------------------------------------------------
    const { data: reservas, error } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        id_reserva, fecha, inicio, fin, precio_total, estado, notas, 
        created_at, cancelado_at, origen,
        cliente_nombre,
        canchas(nombre),
        cliente_telefono, cliente_email,
        creado_por, cancelado_por
      `,
      )
      .eq("id_club", id_club)
      .ilike("cliente_nombre", decodedName) // ilike es más seguro para nombres manuales
      .is("id_usuario", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!reservas || reservas.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    // ----------------------------------------------------------------------
    // PASO 2: Buscar nombres de responsables manualmente
    // ----------------------------------------------------------------------
    const userIds = new Set<string>();
    reservas.forEach((r) => {
      if (r.creado_por) userIds.add(r.creado_por);
      if (r.cancelado_por) userIds.add(r.cancelado_por);
    });

    // Mapa: ID -> "Nombre Apellido"
    const namesMap: Record<string, string> = {};

    if (userIds.size > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id_usuario, nombre, apellido")
        .in("id_usuario", Array.from(userIds));

      profiles?.forEach((p) => {
        namesMap[p.id_usuario] = `${p.nombre} ${p.apellido}`;
      });
    }

    // ----------------------------------------------------------------------
    // PASO 3: Cruzar datos para Auditoría
    // ----------------------------------------------------------------------
    const historialFormateado = reservas.map((r: any) => {
      let accion = "Creado";
      let fechaAccion = r.created_at; // Por defecto fecha de creación
      let responsable = "Sistema";

      // Lógica de Auditoría
      if (r.estado === "cancelada" || r.estado === "rechazada") {
        accion = "Cancelado";
        // Si hay fecha de cancelación, úsala. Si no, created_at.
        fechaAccion = r.cancelado_at || r.created_at;

        // Buscar quién canceló en el mapa de nombres
        if (r.cancelado_por && namesMap[r.cancelado_por]) {
          responsable = namesMap[r.cancelado_por];
        } else {
          responsable = "Admin";
        }
      } else {
        // Estado Activo
        accion = "Creado";
        fechaAccion = r.created_at;

        if (r.creado_por && namesMap[r.creado_por]) {
          responsable = namesMap[r.creado_por];
        } else if (r.origen === "web" || r.origen === "app") {
          responsable = "Usuario (Web)";
        } else {
          responsable = "Admin";
        }
      }

      return {
        ...r,
        audit_accion: accion,
        audit_fecha: fechaAccion,
        audit_responsable: responsable,
      };
    });

    // ----------------------------------------------------------------------
    // PASO 4: Estadísticas
    // ----------------------------------------------------------------------
    const nombreReal = reservas[0].cliente_nombre;
    const totalReservas = reservas.length;
    const totalGastado = reservas.reduce(
      (acc, curr) => acc + Number(curr.precio_total),
      0,
    );

    const ultimoDato = reservas[0];
    const telefono = ultimoDato.cliente_telefono || "";
    const email = ultimoDato.cliente_email || "";

    // ----------------------------------------------------------------------
    // PASO 5: Notas
    // ----------------------------------------------------------------------
    const key = telefono ? telefono : nombreReal.toLowerCase();
    const { data: notaData } = await supabaseAdmin
      .from("club_usuarios_manuales_info")
      .select("notas")
      .eq("id_club", id_club)
      .eq("identificador", key)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      perfil: {
        nombre: nombreReal,
        telefono: telefono || "Sin teléfono",
        email: email || "Sin email",
        total_reservas: totalReservas,
        total_gastado: totalGastado,
        notas: notaData?.notas || "",
      },
      historial: historialFormateado,
    });
  } catch (error: any) {
    console.error("Error API Usuario:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
