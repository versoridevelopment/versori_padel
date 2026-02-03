"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
      ].join(" ")}
    >
      {label}
    </span>
  );
}







export default function ClubesPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/clubes", { cache: "no-store" });

      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(e?.error || "Error al cargar clubes");
      }

      const data = (await res.json()) as Club[];
      setClubs(data);
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return clubs
      .filter((c) => (showInactive ? true : c.estado === true))
      .filter((c) => {
        if (!term) return true;
        return (
          c.nombre.toLowerCase().includes(term) ||
          c.subdominio.toLowerCase().includes(term)
        );
      });
  }, [clubs, q, showInactive]);

  async function setEstado(id_club: number, estado: boolean) {
    try {
      const res = await fetch(`/api/superadmin/clubes/${id_club}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });

      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(e?.error || "No se pudo actualizar el estado");
      }

      setClubs((prev) =>
        prev.map((c) => (c.id_club === id_club ? { ...c, estado } : c))
      );
    } catch (err: any) {
      alert(err?.message || "Error al actualizar estado");
    }
  }

  async function bajaLogica(id_club: number) {
    if (!confirm("¿Desactivar este club? (baja lógica)")) return;

    try {
      const res = await fetch(`/api/superadmin/clubes/${id_club}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const e = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(e?.error || "No se pudo desactivar el club");
      }

      setClubs((prev) =>
        prev.map((c) => (c.id_club === id_club ? { ...c, estado: false } : c))
      );
    } catch (err: any) {
      alert(err?.message || "Error al desactivar");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Clubes (Tenants)
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestión de clubes, subdominios y estado (baja lógica).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Recargar
          </button>

          <Link
            href="/superadmin/clubes/nuevo"
            className="rounded-xl bg-[#003366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00284f]"
          >
            Nuevo club
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o subdominio…"
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#003366]/20"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">Cargando clubes…</div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-700">
            {error}
            <div className="mt-3">
              <button
                onClick={load}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">
            No hay clubes para mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-5 py-3 font-semibold">Club</th>
                  <th className="px-5 py-3 font-semibold">Subdominio</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Creado</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id_club} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">
                        {c.nombre}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {c.id_club}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-mono text-gray-900">
                        {c.subdominio}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.subdominio}.tudominio.com
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge ok={c.estado} label={c.estado ? "Activo" : "Inactivo"} />
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {new Date(c.created_at).toLocaleString("es-AR")}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/superadmin/clubes/${c.id_club}`}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                        >
                          Editar
                        </Link>

                        {c.estado ? (
                          <button
                            onClick={() => bajaLogica(c.id_club)}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => setEstado(c.id_club, true)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
