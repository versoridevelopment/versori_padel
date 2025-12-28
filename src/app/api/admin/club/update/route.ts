import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // 1. Recibir FormData
    const formData = await request.formData();
    const clubId = formData.get("clubId") as string;

    // Parsear datos
    const clubData = JSON.parse(formData.get("clubData") as string);
    const nosotrosData = JSON.parse(formData.get("nosotrosData") as string);

    // --- A. ACTUALIZAR TABLA 'CLUBES' ---
    // Solo actualizamos lo que realmente existe en esta tabla
    const clubUpdates = {
      nombre: clubData.nombre,
      subdominio: clubData.subdominio,
      color_primario: clubData.color_primario,
      color_secundario: clubData.color_secundario,
      color_texto: clubData.color_texto,
      texto_bienvenida_titulo: clubData.texto_bienvenida_titulo,
      texto_bienvenida_subtitulo: clubData.texto_bienvenida_subtitulo,
      marcas: clubData.marcas,
      activo_profesores: clubData.activo_profesores, // Ahora sí se guarda

      // Imágenes (si las hubiera, aquí iría la lógica de URL)
      logo_url: clubData.logo_url,
      imagen_hero_url: clubData.imagen_hero_url,

      updated_at: new Date().toISOString(),
    };

    const { error: clubError } = await supabase
      .from("clubes")
      .update(clubUpdates)
      .eq("id_club", clubId);

    if (clubError)
      throw new Error(`Error actualizando club: ${clubError.message}`);

    // --- B. ACTUALIZAR TABLA 'CONTACTO' ---
    // Primero buscamos el ID del contacto asociado al club
    const { data: contactoData, error: contactFetchError } = await supabase
      .from("contacto")
      .select("id_contacto")
      .eq("id_club", clubId)
      .single();

    if (!contactFetchError && contactoData) {
      // Actualizamos email e instagram en tabla contacto
      await supabase
        .from("contacto")
        .update({
          email: clubData.email,
          updated_at: new Date().toISOString(),
          // Si tuvieras columna instagram aquí, la agregas
        })
        .eq("id_contacto", contactoData.id_contacto);

      // --- C. ACTUALIZAR TABLA 'DIRECCION' ---
      // Usamos el id_contacto para encontrar la dirección
      // AQUÍ CORREGIMOS EL NOMBRE DE LA COLUMNA 'Altura_calle'
      const direccionUpdates = {
        calle: clubData.calle,
        Altura_calle: clubData.altura, // Mapeamos 'altura' del form a 'Altura_calle' de la BD
        barrio: clubData.barrio,
        updated_at: new Date().toISOString(),
      };

      // Verificamos si ya existe dirección para hacer Update o Insert
      const { data: existingDir } = await supabase
        .from("direccion")
        .select("id_direccion")
        .eq("id_contacto", contactoData.id_contacto)
        .maybeSingle();

      if (existingDir) {
        await supabase
          .from("direccion")
          .update(direccionUpdates)
          .eq("id_direccion", existingDir.id_direccion);
      } else {
        // Si no existe, creamos una nueva
        await supabase.from("direccion").insert({
          ...direccionUpdates,
          id_contacto: contactoData.id_contacto,
        });
      }

      // --- D. ACTUALIZAR TELEFONO (Opcional simplificado) ---
      // Por ahora asumimos que actualizamos el teléfono principal
      // (Esto requeriría lógica más compleja si hay múltiples teléfonos, pero para este fix sirve)
      // ...
    }

    // --- E. ACTUALIZAR 'NOSOTROS' ---
    // (Misma lógica que tenías antes)
    const { data: existingNosotros } = await supabase
      .from("nosotros")
      .select("id")
      .eq("id_club", clubId)
      .maybeSingle();

    const nosotrosUpdates = {
      activo_nosotros: nosotrosData.activo_nosotros,
      historia_titulo: nosotrosData.historia_titulo,
      hero_descripcion: nosotrosData.hero_descripcion,
      historia_contenido: nosotrosData.historia_contenido,
      frase_cierre: nosotrosData.frase_cierre,
      galeria_inicio: nosotrosData.galeria_inicio,
      valores: nosotrosData.valores,
      updated_at: new Date().toISOString(),
    };

    if (existingNosotros) {
      await supabase
        .from("nosotros")
        .update(nosotrosUpdates)
        .eq("id_club", clubId);
    } else {
      await supabase
        .from("nosotros")
        .insert({ ...nosotrosUpdates, id_club: clubId });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en update:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
