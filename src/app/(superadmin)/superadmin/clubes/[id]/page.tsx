"use client";

import { useEffect, useMemo, useState } from "react";
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

      <div className="p-5 space-y-3">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Logo URL:</span>{" "}
          <span className="break-all">{logo_url || "-"}</span>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-semibold">Hero URL:</span>{" "}
          <span className="break-all">{imagen_hero_url || "-"}</span>
        </div>
      </div>
    </div>
  );
}

export default function EditarClubPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [club, setClub] = useState<Club | null>(null);
  const [form, setForm] = useState<Club | null>(null);

  const canSubmit = useMemo(() => {
    if (!form) return false;
    return (
      form.nombre.trim() &&
      form.subdominio.trim() &&
      form.logo_url.trim() &&
      form.color_primario.trim() &&
      form.color_secundario.trim() &&
      form.imagen_hero_url.trim() &&
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
      const res = await fetch(`/api/superadmin/clubes/${id}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(err?.error || "No se pudo cargar el club");
      }

      const data = (await res.json()) as Club;
      setClub(data);
      setForm({ ...data });
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
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !canSubmit || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/superadmin/clubes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          subdominio: form.subdominio,
          logo_url: form.logo_url,
          color_primario: form.color_primario,
          color_secundario: form.color_secundario,
          imagen_hero_url: form.imagen_hero_url,
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

      const updated = (await res.json()) as Club;
      setClub(updated);
      setForm({ ...updated });
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
      const res = await fetch(`/api/superadmin/clubes/${id}`, {
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
      const res = await fetch(`/api/superadmin/clubes/${id}`, {
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
      {/* Header */}
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
        {/* Form */}
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
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Logo URL
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                value={form.logo_url}
                onChange={(e) => setField("logo_url", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Hero URL
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
                value={form.imagen_hero_url}
                onChange={(e) => setField("imagen_hero_url", e.target.value)}
              />
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

        {/* Preview */}
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
        />
      </div>
    </div>
  );
}
