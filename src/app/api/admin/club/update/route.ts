import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const clubId = formData.get("clubId") as string;

    if (!clubId)
      return NextResponse.json({ error: "Falta ID" }, { status: 400 });

    const clubDataRaw = formData.get("clubData");
    if (clubDataRaw) {
      const clubData = JSON.parse(clubDataRaw as string);

      // 1. Clubes
      const { error: clubError } = await supabaseAdmin
        .from("clubes")
        .update({
          nombre: clubData.nombre,
          subdominio: clubData.subdominio,
          color_primario: clubData.color_primario,
          color_secundario: clubData.color_secundario,
          color_texto: clubData.color_texto,
          texto_bienvenida_titulo: clubData.texto_bienvenida_titulo,
          texto_bienvenida_subtitulo: clubData.texto_bienvenida_subtitulo,
          marcas: clubData.marcas,
          activo_contacto_home: Boolean(clubData.activo_contacto_home),
          logo_url: clubData.logo_url,
          imagen_hero_url: clubData.imagen_hero_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id_club", clubId);

      if (clubError) throw clubError;

      // 2. Nosotros (Autocompletado básico)
      const { data: existingNosotros } = await supabaseAdmin
        .from("nosotros")
        .select("id_nosotros")
        .eq("id_club", clubId)
        .maybeSingle();

      if (!existingNosotros) {
        await supabaseAdmin.from("nosotros").insert({
          id_club: clubId,
          home_titulo: `Bienvenidos a ${clubData.nombre}`,
          historia_titulo: "Nuestra Historia",
          activo_nosotros: true,
        });
      }

      // 3. Contacto (Base)
      let { data: contactoData } = await supabaseAdmin
        .from("contacto")
        .select("id_contacto")
        .eq("id_club", clubId)
        .maybeSingle();

      if (!contactoData) {
        const { data: newC } = await supabaseAdmin
          .from("contacto")
          .insert({
            id_club: clubId,
            email: clubData.email,
            usuario_instagram: clubData.usuario_instagram,
          })
          .select("id_contacto")
          .single();
        contactoData = newC;
      } else {
        await supabaseAdmin
          .from("contacto")
          .update({
            email: clubData.email,
            usuario_instagram: clubData.usuario_instagram,
          })
          .eq("id_contacto", contactoData.id_contacto);
      }

      // 4. Dirección y Teléfono
      if (contactoData) {
        // --- DIRECCIÓN (FIX CRÍTICO: No enviar updated_at) ---
        const dirPayload = {
          calle: clubData.calle,
          altura_calle: clubData.altura, // Mapeo correcto
          barrio: clubData.barrio,
        };

        const { data: existingDir } = await supabaseAdmin
          .from("direccion")
          .select("id_direccion")
          .eq("id_contacto", contactoData.id_contacto)
          .maybeSingle();

        if (existingDir) {
          await supabaseAdmin
            .from("direccion")
            .update(dirPayload)
            .eq("id_direccion", existingDir.id_direccion);
        } else if (dirPayload.calle || dirPayload.altura_calle) {
          await supabaseAdmin
            .from("direccion")
            .insert({ ...dirPayload, id_contacto: contactoData.id_contacto });
        }

        // --- TELÉFONO ---
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
