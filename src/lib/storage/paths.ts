// src/lib/storage/paths.ts

export const PUBLIC_MEDIA_BUCKET = "public-media";

// --- HELPERS DE RUTAS ---
export function clubBasePath(idClub: number) {
  return `club_${idClub}`;
}

export function clubBrandingPath(idClub: number) {
  return `${clubBasePath(idClub)}/branding`;
}

// --- UTILIDADES DE ARCHIVO ---
export function safeFileExt(file: File) {
  const name = file.name || "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot > -1 && lastDot < name.length - 1) {
    const ext = name
      .slice(lastDot + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (ext) return ext;
  }
  return "jpg"; // Fallback
}

// --- GENERADORES DE PATHS ---
export function buildLogoPath(idClub: number, file: File) {
  const ext = safeFileExt(file);
  return `${clubBrandingPath(idClub)}/logo-${Date.now()}.${ext}`;
}

export function buildHeroPath(idClub: number, file: File) {
  const ext = safeFileExt(file);
  return `${clubBrandingPath(idClub)}/hero-${Date.now()}.${ext}`;
}

export function buildNosotrosPath(idClub: number, file: File) {
  const ext = safeFileExt(file);
  // Guardamos en la carpeta 'nosotros' (o 'establecimiento' si prefieres)
  return `${clubBasePath(idClub)}/nosotros/imagen-${Date.now()}.${ext}`;
}

export function buildNosotrosGalleryPath(idClub: number, file: File) {
  const ext = safeFileExt(file);
  // Usamos randomUUID o Date + Random para evitar colisiones en subidas múltiples
  const uniqueId = crypto.randomUUID().split("-")[0];
  return `${clubBasePath(
    idClub
  )}/nosotros/gallery-${Date.now()}-${uniqueId}.${ext}`;
}

export function buildStaffPath(idClub: number, file: File) {
  const ext = safeFileExt(file);
  // Guardamos en la carpeta 'staff'
  return `${clubBasePath(idClub)}/staff/profe-${Date.now()}.${ext}`;
}
