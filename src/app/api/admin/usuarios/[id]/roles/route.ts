import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const { clubId, roleName } = await request.json();

    // 1. Validar que el rol sea uno de los permitidos
    const allowedRoles = ["admin", "cajero"];
    if (!allowedRoles.includes(roleName)) {
      return NextResponse.json(
        { error: "Rol no permitido para gestión manual" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    // 2. Verificar Autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 3. Verificar que quien solicita sea ADMIN (Cajero no puede editar roles)
    const { data: requesterRole } = await supabase
      .from("club_usuarios")
      .select("roles!inner(nombre)")
      .eq("id_usuario", user.id)
      .eq("id_club", clubId)
      .eq("roles.nombre", "admin") // Solo ADMIN pasa
      .maybeSingle();

    if (!requesterRole) {
      return NextResponse.json(
        { error: "Solo los administradores pueden gestionar permisos." },
        { status: 403 },
      );
    }

    // 4. Obtener ID del Rol objetivo
    const { data: roleData } = await supabase
      .from("roles")
      .select("id_rol")
      .eq("nombre", roleName)
      .single();

    if (!roleData)
      return NextResponse.json(
        { error: "Rol no encontrado en sistema" },
        { status: 404 },
      );

    // 5. Verificar estado actual del usuario objetivo
    const { data: existingLink } = await supabase
      .from("club_usuarios")
      .select("*")
      .eq("id_usuario", targetUserId)
      .eq("id_club", clubId)
      .eq("id_rol", roleData.id_rol)
      .maybeSingle();

    // 6. Ejecutar Acción (Toggle)
    if (existingLink) {
      // Eliminar Rol
      const { error: delError } = await supabase
        .from("club_usuarios")
        .delete()
        .eq("id_usuario", targetUserId)
        .eq("id_club", clubId)
        .eq("id_rol", roleData.id_rol);

      if (delError) throw delError;
      return NextResponse.json({
        message: `Rol ${roleName} revocado`,
        action: "removed",
      });
    } else {
      // Agregar Rol
      const { error: insError } = await supabase.from("club_usuarios").insert({
        id_usuario: targetUserId,
        id_club: clubId,
        id_rol: roleData.id_rol,
      });

      if (insError) throw insError;
      return NextResponse.json({
        message: `Rol ${roleName} asignado`,
        action: "added",
      });
    }
  } catch (error: any) {
    console.error("Error gestionando rol:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
