"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Club = {
  id_club: number;
  nombre: string;
  subdominio: string;
  logo_url: string;
  color_primario: string;
  color_secundario: string;
  imagen_hero_url: string;
  color_texto: string;
  texto_bienvenida_titulo: string;
  texto_bienvenida_subtitulo: string;
  estado: boolean;
  created_at: string;
};

type ApiError = { error: string };

type PageParams = { id: string };

async function uploadClubImages(
  idClub: number,
  logoFile?: File | null,
  heroFile?: File | null
) {
  const fd = new FormData();
  if (logoFile) fd.append("logo", logoFile);
  if (heroFile) fd.append("hero", heroFile);

  const res = await fetch(`/api/superadmin/clubes/${idClub}/upload`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const e = await res.json().catch(() => null);
    throw new Error(e?.error || "Error subiendo imágenes");
  }

  return res.json() as Promise<{
    ok: boolean;
    id_club: number;
    logo_url: string | null;
    imagen_hero_url: string | null;
  }>;
}

function PreviewCard(props: {
  nombre: string;
  subdominio: string;
  logo_url: string;
  imagen_hero_url: string;
  color_primario: string;
  color_secundario: string;
  color_texto: string;
  texto_bienvenida_titulo: string;
  texto_bienvenida_subtitulo: string;
  estado: boolean;
  logoPreview?: string | null;
  heroPreview?: string | null;
}) {
  const {
    nombre,
    subdominio,
    logo_url,
    imagen_hero_url,
    color_primario,
    color_secundario,
    color_texto,
    texto_bienvenida_titulo,
    texto_bienvenida_subtitulo,
    estado,
    logoPreview,
    heroPreview,
  } = props;

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      <div
        className="p-5"
        style={{
          background: `linear-gradient(135deg, ${color_primario}, ${color_secundario})`,
          color: color_texto,
        }}
      >
        <div className="text-sm opacity-90">
          Preview (Branding) · {estado ? "Activo" : "Inactivo"}
        </div>
        <div className="mt-2 text-2xl font-extrabold tracking-tight">
          {texto_bienvenida_titulo || "Título de bienvenida"}
        </div>
        <div className="mt-1 text-sm opacity-90">
          {texto_bienvenida_subtitulo || "Subtítulo de bienvenida"}
        </div>

        <div className="mt-4 text-xs opacity-90">
          {nombre || "Nombre del club"} · {subdominio || "subdominio"}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 p-3">
            <div className="text-xs font-semibold text-gray-700">Logo</div>
            <div className="mt-2">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="logo preview"
                  className="h-20 w-20 object-cover rounded-lg border"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo_url}
                  alt="logo actual"
                  className="h-20 w-20 object-cover rounded-lg border"
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <div className="text-xs font-semibold text-gray-700">Hero</div>
            <div className="mt-2">
              {heroPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroPreview}
                  alt="hero preview"
                  className="h-20 w-full object-cover rounded-lg border"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagen_hero_url}
                  alt="hero actual"
                  className="h-20 w-full object-cover rounded-lg border"
                />
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Las URLs de imágenes son de solo lectura. Para cambiarlas, subí un
          archivo y guardá.
        </div>
      </div>
    </div>
  );
}

export default function EditarClubPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = use(params); // ✅ Next 15: params es Promise en Client
  const router = useRouter();
  const idClub = Number(id);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [club, setClub] = useState<Club | null>(null);
  const [form, setForm] = useState<Club | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  const logoPreview = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : null),
    [logoFile]
  );

  const heroPreview = useMemo(
    () => (heroFile ? URL.createObjectURL(heroFile) : null),
    [heroFile]
  );

  const canSubmit = useMemo(() => {
    if (!form) return false;
    return (
      form.nombre.trim() &&
      form.subdominio.trim() &&
      form.color_primario.trim() &&
      form.color_secundario.trim() &&
      form.color_texto.trim() &&
      form.texto_bienvenida_titulo.trim() &&
      form.texto_bienvenida_subtitulo.trim()
    );
  }, [form]);

  function setField<K extends keyof Club>(key: K, value: Club[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function load() {
    setLoading(true);
    try {
      if (!idClub || Number.isNaN(idClub)) {
        throw new Error("ID de club inválido");
      }

      const res = await fetch(`/api/superadmin/clubes/${idClub}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(err?.error || "No se pudo cargar el club");
      }

      const data = (await res.json()) as Club;
      setClub(data);
      setForm({ ...data });

      setLogoFile(null);
      setHeroFile(null);
    } catch (err: any) {
      alert(err?.message || "Error al cargar club");
      router.push("/superadmin/clubes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idClub]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !canSubmit || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/superadmin/clubes/${idClub}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          subdominio: form.subdominio,
          color_primario: form.color_primario,
          color_secundario: form.color_secundario,
          color_texto: form.color_texto,
          texto_bienvenida_titulo: form.texto_bienvenida_titulo,
          texto_bienvenida_subtitulo: form.texto_bienvenida_subtitulo,
          estado: form.estado,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(err?.error || "No se pudo guardar el club");
      }

      if (logoFile || heroFile) {
        await uploadClubImages(idClub, logoFile, heroFile);
      }

      await load();
      alert("Cambios guardados.");
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  async function onDesactivar() {
    if (!confirm("¿Desactivar este club? (baja lógica)")) return;

    try {
      const res = await fetch(`/api/superadmin/clubes/${idClub}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(err?.error || "No se pudo desactivar");
      }

      await load();
    } catch (err: any) {
      alert(err?.message || "Error al desactivar");
    }
  }

  async function onActivar() {
    try {
      const res = await fetch(`/api/superadmin/clubes/${idClub}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: true }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(err?.error || "No se pudo activar");
      }

      await load();
    } catch (err: any) {
      alert(err?.message || "Error al activar");
    }
  }

  if (loading || !form) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Cargando club…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Editar club #{club?.id_club}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {club?.nombre} · {club?.subdominio}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/superadmin/clubes"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Volver
          </Link>

          {form.estado ? (
            <button
              onClick={onDesactivar}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Desactivar
            </button>
          ) : (
            <button
              onClick={onActivar}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Activar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={onSave}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Nombre
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                value={form.nombre}
                onChange={(e) => setField("nombre", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Subdominio
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-mono"
                value={form.subdominio}
                onChange={(e) =>
                  setField(
                    "subdominio",
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "")
                      .replace(/[^a-z0-9-]/g, "")
                  )
                }
              />
              <div className="mt-1 text-xs text-gray-500">
                Solo minúsculas, números y guiones.
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Reemplazar logo (archivo)
              </label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm bg-white"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <div className="mt-1 text-xs text-gray-500">
                Opcional. Se sube al guardar.
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Reemplazar hero (archivo)
              </label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm bg-white"
                onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
              />
              <div className="mt-1 text-xs text-gray-500">
                Opcional. Se sube al guardar.
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Logo URL (solo lectura)
              </label>
              <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700 break-all">
                {form.logo_url}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Hero URL (solo lectura)
              </label>
              <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700 break-all">
                {form.imagen_hero_url}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Color primario
              </label>
              <input
                type="color"
                className="mt-1 h-10 w-full rounded-xl border border-gray-200 p-1"
                value={form.color_primario}
                onChange={(e) => setField("color_primario", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Color secundario
              </label>
              <input
                type="color"
                className="mt-1 h-10 w-full rounded-xl border border-gray-200 p-1"
                value={form.color_secundario}
                onChange={(e) => setField("color_secundario", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Color texto
              </label>
              <input
                type="color"
                className="mt-1 h-10 w-full rounded-xl border border-gray-200 p-1"
                value={form.color_texto}
                onChange={(e) => setField("color_texto", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Texto bienvenida (título)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                value={form.texto_bienvenida_titulo}
                onChange={(e) =>
                  setField("texto_bienvenida_titulo", e.target.value)
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">
                Texto bienvenida (subtítulo)
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                value={form.texto_bienvenida_subtitulo}
                onChange={(e) =>
                  setField("texto_bienvenida_subtitulo", e.target.value)
                }
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.estado}
                onChange={(e) => setField("estado", e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                Club activo (estado = 1)
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Link
              href="/superadmin/clubes"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-[#003366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00284f] disabled:opacity-60"
              disabled={!canSubmit || isSaving}
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        <PreviewCard
          nombre={form.nombre}
          subdominio={form.subdominio}
          logo_url={form.logo_url}
          imagen_hero_url={form.imagen_hero_url}
          color_primario={form.color_primario}
          color_secundario={form.color_secundario}
          color_texto={form.color_texto}
          texto_bienvenida_titulo={form.texto_bienvenida_titulo}
          texto_bienvenida_subtitulo={form.texto_bienvenida_subtitulo}
          estado={form.estado}
          logoPreview={logoPreview}
          heroPreview={heroPreview}
        />
      </div>
    </div>
  );
}
