import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin"; // Asegúrate de tener este cliente configurado con la Service Role Key

export async function POST(request: Request) {
  try {
    // 1. Recibir FormData
    const formData = await request.formData();
    const clubId = formData.get("clubId") as string;

    if (!clubId) {
      return NextResponse.json(
        { error: "Falta el ID del club" },
        { status: 400 }
      );
    }

    const clubDataRaw = formData.get("clubData");
    const nosotrosDataRaw = formData.get("nosotrosData");

    // ---------------------------------------------------------
    // A. ACTUALIZAR CLUB (Usando supabaseAdmin)
    // ---------------------------------------------------------
    if (clubDataRaw) {
      const clubData = JSON.parse(clubDataRaw as string);

      const clubUpdates = {
        nombre: clubData.nombre,
        subdominio: clubData.subdominio,
        color_primario: clubData.color_primario,
        color_secundario: clubData.color_secundario,
        color_texto: clubData.color_texto,
        texto_bienvenida_titulo: clubData.texto_bienvenida_titulo,
        texto_bienvenida_subtitulo: clubData.texto_bienvenida_subtitulo,
        marcas: clubData.marcas,
        activo_profesores: clubData.activo_profesores,
        activo_contacto_home: clubData.activo_contacto_home, // Toggle de WhatsApp
        logo_url: clubData.logo_url,
        imagen_hero_url: clubData.imagen_hero_url,
        updated_at: new Date().toISOString(),
      };

      const { error: clubError } = await supabaseAdmin
        .from("clubes")
        .update(clubUpdates)
        .eq("id_club", clubId);

      if (clubError)
        throw new Error(`Error actualizando club: ${clubError.message}`);

      // --- Contacto / Dirección / Teléfono ---
      const { data: contactoData } = await supabaseAdmin
        .from("contacto")
        .select("id_contacto")
        .eq("id_club", clubId)
        .single();

      if (contactoData) {
        // Contacto
        await supabaseAdmin
          .from("contacto")
          .update({
            email: clubData.email,
            usuario_instagram: clubData.usuario_instagram,
          })
          .eq("id_contacto", contactoData.id_contacto);

        // Dirección
        const direccionUpdates = {
          calle: clubData.calle,
          altura_calle: clubData.altura,
          barrio: clubData.barrio,
          updated_at: new Date().toISOString(),
        };

        const { data: existingDir } = await supabaseAdmin
          .from("direccion")
          .select("id_direccion")
          .eq("id_contacto", contactoData.id_contacto)
          .maybeSingle();

        if (existingDir) {
          await supabaseAdmin
            .from("direccion")
            .update(direccionUpdates)
            .eq("id_direccion", existingDir.id_direccion);
        } else {
          await supabaseAdmin
            .from("direccion")
            .insert({
              ...direccionUpdates,
              id_contacto: contactoData.id_contacto,
            });
        }

        // Teléfono (Principal)
        const { data: existingTel } = await supabaseAdmin
          .from("telefono")
          .select("id_telefono")
          .eq("id_contacto", contactoData.id_contacto)
          .eq("tipo", "Principal")
          .maybeSingle();

        if (existingTel) {
          await supabaseAdmin
            .from("telefono")
            .update({ numero: clubData.telefono })
            .eq("id_telefono", existingTel.id_telefono);
        } else if (clubData.telefono) {
          await supabaseAdmin.from("telefono").insert({
            id_contacto: contactoData.id_contacto,
            numero: clubData.telefono,
            tipo: "Principal",
          });
        }
      }
    }

    // ---------------------------------------------------------
    // B. ACTUALIZAR NOSOTROS (Usando supabaseAdmin)
    // ---------------------------------------------------------
    if (nosotrosDataRaw) {
      const nosotrosData = JSON.parse(nosotrosDataRaw as string);

      const nosotrosUpdates = {
        activo_nosotros: nosotrosData.activo_nosotros,

        // DATOS PÁGINA INTERNA
        historia_titulo: nosotrosData.historia_titulo,
        hero_descripcion: nosotrosData.hero_descripcion,
        historia_contenido: nosotrosData.historia_contenido,
        frase_cierre: nosotrosData.frase_cierre,

        // DATOS HOME (Nuevos campos separados)
        home_titulo: nosotrosData.home_titulo,
        home_descripcion: nosotrosData.home_descripcion,
        galeria_inicio: nosotrosData.galeria_inicio,

        valores: nosotrosData.valores,
        updated_at: new Date().toISOString(),
      };

      // Upsert directo
      const { error } = await supabaseAdmin
        .from("nosotros")
        .upsert(
          { ...nosotrosUpdates, id_club: clubId },
          { onConflict: "id_club" }
        );

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en update API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
