import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { PUBLIC_MEDIA_BUCKET } from "@/lib/storage/paths";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 1. Extraer datos básicos
    const clubId = formData.get("clubId") as string;
    const clubDataRaw = formData.get("clubData") as string;
    const nosotrosDataRaw = formData.get("nosotrosData") as string;

    if (!clubId)
      return NextResponse.json({ error: "Falta Club ID" }, { status: 400 });

    const clubData = JSON.parse(clubDataRaw);
    const nosotrosData = JSON.parse(nosotrosDataRaw);

    // --- FUNCIÓN HELPER PARA SUBIDAS ---
    const uploadFile = async (file: File, path: string) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { error } = await supabaseAdmin.storage
        .from(PUBLIC_MEDIA_BUCKET)
        .upload(path, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabaseAdmin.storage
        .from(PUBLIC_MEDIA_BUCKET)
        .getPublicUrl(path);

      return data.publicUrl;
    };

    // 2. PROCESAR ARCHIVOS PRINCIPALES
    const logoFile = formData.get("logoFile") as File | null;
    const heroFile = formData.get("heroFile") as File | null;
    const nosotrosMainFile = formData.get("nosotrosMainFile") as File | null;

    if (logoFile) {
      const path = `club_${clubId}/branding/logo-${Date.now()}.${logoFile.name
        .split(".")
        .pop()}`;
      clubData.logo_url = await uploadFile(logoFile, path);
    }

    if (heroFile) {
      const path = `club_${clubId}/branding/hero-${Date.now()}.${heroFile.name
        .split(".")
        .pop()}`;
      clubData.imagen_hero_url = await uploadFile(heroFile, path);
    }

    if (nosotrosMainFile) {
      const path = `club_${clubId}/nosotros/main-${Date.now()}.${nosotrosMainFile.name
        .split(".")
        .pop()}`;
      nosotrosData.historia_imagen_url = await uploadFile(
        nosotrosMainFile,
        path
      );
    }

    // 3. PROCESAR MARCAS
    if (clubData.marcas && Array.isArray(clubData.marcas)) {
      for (let i = 0; i < clubData.marcas.length; i++) {
        const marca = clubData.marcas[i];
        if (marca.tipo === "imagen") {
          const brandFile = formData.get(
            `brand_file_${marca.id}`
          ) as File | null;
          if (brandFile) {
            const path = `club_${clubId}/branding/marcas/${
              marca.id
            }-${Date.now()}.${brandFile.name.split(".").pop()}`;
            clubData.marcas[i].valor = await uploadFile(brandFile, path);
          }
        }
      }
    }

    // 4. PROCESAR GALERÍA
    const galleryFiles = formData.getAll("galleryFiles") as File[];
    const currentGallery = nosotrosData.galeria_inicio || [];
    const newGalleryUrls: string[] = [];

    for (const file of galleryFiles) {
      const path = `club_${clubId}/nosotros/gallery/slide-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${file.name.split(".").pop()}`;
      const url = await uploadFile(file, path);
      newGalleryUrls.push(url);
    }

    nosotrosData.galeria_inicio = [...currentGallery, ...newGalleryUrls];

    // 5. ACTUALIZAR BASE DE DATOS

    // A) Tabla Clubes
    const { error: errClub } = await supabaseAdmin
      .from("clubes")
      .update({
        nombre: clubData.nombre,
        color_primario: clubData.color_primario,
        color_secundario: clubData.color_secundario,
        color_texto: clubData.color_texto,
        texto_bienvenida_titulo: clubData.texto_bienvenida_titulo,
        texto_bienvenida_subtitulo: clubData.texto_bienvenida_subtitulo,
        logo_url: clubData.logo_url,
        imagen_hero_url: clubData.imagen_hero_url,
        marcas: clubData.marcas,
      })
      .eq("id_club", clubId);

    if (errClub) throw errClub;

    // B) Tabla Contacto
    const { data: contactData, error: errContact } = await supabaseAdmin
      .from("contacto")
      .upsert(
        {
          id_club: clubId,
          email: clubData.email,
          usuario_instagram: clubData.usuario_instagram,
        },
        { onConflict: "id_club" }
      )
      .select()
      .single();

    if (errContact) throw errContact;

    // C) Direcciones y Teléfonos
    if (contactData) {
      await supabaseAdmin
        .from("direccion")
        .delete()
        .eq("id_contacto", contactData.id_contacto);
      await supabaseAdmin.from("direccion").insert({
        id_contacto: contactData.id_contacto,
        calle: clubData.calle,
        altura_calle: clubData.altura,
        barrio: clubData.barrio,
      });

      await supabaseAdmin
        .from("telefono")
        .delete()
        .eq("id_contacto", contactData.id_contacto);
      await supabaseAdmin.from("telefono").insert({
        id_contacto: contactData.id_contacto,
        numero: clubData.telefono,
        tipo: "Principal",
      });
    }

    // D) Tabla Nosotros
    const { error: errNosotros } = await supabaseAdmin.from("nosotros").upsert(
      {
        id_club: clubId,
        historia_titulo: nosotrosData.historia_titulo,
        hero_descripcion: nosotrosData.hero_descripcion,
        historia_contenido: nosotrosData.historia_contenido,
        frase_cierre: nosotrosData.frase_cierre,
        historia_imagen_url: nosotrosData.historia_imagen_url,
        galeria_inicio: nosotrosData.galeria_inicio,
        valores: nosotrosData.valores,
      },
      { onConflict: "id_club" }
    );

    if (errNosotros) throw errNosotros;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en API update:", error);
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
