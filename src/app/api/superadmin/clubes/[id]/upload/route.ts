import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { PUBLIC_MEDIA_BUCKET, clubBasePath } from "@/lib/storage/paths";

export const runtime = "nodejs";

type RouteParams = { id: string };

function extFromMimeOrName(file: File) {
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  if (dot > -1 && dot < name.length - 1) return name.slice(dot + 1).toLowerCase();

  const mime = (file.type || "").toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function brandingLogoPath(idClub: number, ext: string) {
  // ✅ club_{id}/branding/logo.ext
  return `${clubBasePath(idClub)}/branding/logo.${ext}`;
}

function brandingHeroPath(idClub: number, ext: string) {
  // ✅ club_{id}/branding/hero_home.ext
  return `${clubBasePath(idClub)}/branding/hero_home.${ext}`;
}

async function uploadOne(file: File, path: string) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const contentType = file.type || "application/octet-stream";

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Storage upload error (${path}): ${uploadError.message}`);
  }

  const { data: pub } = supabaseAdmin.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .getPublicUrl(path);

  return pub.publicUrl;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await params; // ✅ Next 15
    const idClub = Number(id);

    if (!idClub || Number.isNaN(idClub)) {
      return NextResponse.json({ error: "ID de club inválido" }, { status: 400 });
    }

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubes")
      .select("id_club")
      .eq("id_club", idClub)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });
    }

    const formData = await req.formData();
    const logo = formData.get("logo");
    const hero = formData.get("hero");

    if (!logo && !hero) {
      return NextResponse.json(
        { error: "Debés enviar al menos un archivo: logo o hero" },
        { status: 400 }
      );
    }

    let newLogoUrl: string | null = null;
    let newHeroUrl: string | null = null;

    if (logo && logo instanceof File) {
      const ext = extFromMimeOrName(logo);
      newLogoUrl = await uploadOne(logo, brandingLogoPath(idClub, ext));
    }

    if (hero && hero instanceof File) {
      const ext = extFromMimeOrName(hero);
      newHeroUrl = await uploadOne(hero, brandingHeroPath(idClub, ext));
    }

    const updatePayload: any = {};
    if (newLogoUrl) updatePayload.logo_url = newLogoUrl;
    if (newHeroUrl) updatePayload.imagen_hero_url = newHeroUrl;

    if (Object.keys(updatePayload).length) {
      const { error: updError } = await supabaseAdmin
        .from("clubes")
        .update(updatePayload)
        .eq("id_club", idClub);

      if (updError) {
        return NextResponse.json(
          { error: `Error actualizando club: ${updError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      id_club: idClub,
      logo_url: newLogoUrl,
      imagen_hero_url: newHeroUrl,
      storage_base_path: clubBasePath(idClub), // ✅ club_{id}
    });
  } catch (err: any) {
    console.error("[upload club images] error", err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
