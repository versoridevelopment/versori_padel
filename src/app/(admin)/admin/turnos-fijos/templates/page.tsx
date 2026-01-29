"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Ban, Loader2, Plus } from "lucide-react";
import Link from "next/link";

import { getSubdomainFromHost } from "@/lib/ObetenerClubUtils/tenantUtils";
import { getClubBySubdomain } from "@/lib/ObetenerClubUtils/getClubBySubdomain";

type TurnoFijoRow = {
  id_turno_fijo: number;
  id_club: number;
  id_cancha: number;
  dow: number;
  inicio: string;
  fin: string | null;
  duracion_min: number;
  activo: boolean;
  tipo_turno: string | null;
  segmento: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email?: string | null;
  start_date: string;
  end_date: string | null;
  future_count?: number;
  notas?: string | null;
};

function toISODateAR(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDow(dow: number) {
  return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][dow] ?? String(dow);
}

export default function TemplatesPage() {
  const hoyISO = useMemo(() => toISODateAR(new Date()), []);

  const [idClub, setIdClub] = useState<number | null>(null);

  const [rows, setRows] = useState<TurnoFijoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [regenOpen, setRegenOpen] = useState(false);
  const [regenWeeks, setRegenWeeks] = useState(8);
  const [regenTurno, setRegenTurno] = useState<TurnoFijoRow | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenErr, setRegenErr] = useState<string | null>(null);

  // EXCEPCIÓN (skip) desde templates
  const [excOpen, setExcOpen] = useState(false);
  const [excTurno, setExcTurno] = useState<TurnoFijoRow | null>(null);
  const [excFecha, setExcFecha] = useState<string>(hoyISO);
  const [excAccion, setExcAccion] = useState<"skip" | "override">("skip");
  const [excNotas, setExcNotas] = useState("");
  const [excLoading, setExcLoading] = useState(false);
  const [excErr, setExcErr] = useState<string | null>(null);

  // ✅ Resolver id_club por subdominio (SIN usar agenda, SIN fecha)
  useEffect(() => {
    let alive = true;

    async function resolveClub() {
      try {
        setErr(null);

        // ✅ fallback dev opcional
        const FALLBACK_DEV_CLUB_ID = 9;

        if (typeof window === "undefined") return;

        const hostname = window.location.hostname; // ej: padelcentral.localhost
        const subdomain = getSubdomainFromHost(hostname);

        if (!subdomain) {
          // si estás en localhost sin subdominio, usa club dev
          if (!alive) return;
          setIdClub(FALLBACK_DEV_CLUB_ID);
          return;
        }

        const club = await getClubBySubdomain(subdomain);
        if (!alive) return;

        if (!club?.id_club) {
          setIdClub(null);
          setErr("No se pudo resolver el club por subdominio");
          return;
        }

        setIdClub(club.id_club);
      } catch (e: any) {
        if (!alive) return;
        setIdClub(null);
        setErr(e?.message || "Error resolviendo club");
      }
    }

    resolveClub();
    return () => {
      alive = false;
    };
  }, []);

  async function load() {
    if (!idClub) return;
    setLoading(true);
    setErr(null);
    try {
      // ✅ GLOBAL: sin fecha
      const res = await fetch(`/api/admin/turnos-fijos?id_club=${idClub}&include_future_count=1`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Error cargando templates");
      setRows(json.data || []);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message || "Error interno");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idClub]);

  function openRegenerar(tf: TurnoFijoRow) {
    setRegenTurno(tf);
    setRegenWeeks(8);
    setRegenErr(null);
    setRegenOpen(true);
  }

  async function doRegenerar() {
    if (!regenTurno || !idClub) return;
    setRegenLoading(true);
    setRegenErr(null);
    try {
      const res = await fetch(`/api/admin/turnos-fijos/${regenTurno.id_turno_fijo}/regenerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_club: idClub, weeks_ahead: regenWeeks, on_conflict: "skip" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo regenerar");
      setRegenOpen(false);
      await load();
      alert(`Listo: creadas ${json.created_count}. Conflictos: ${(json.conflicts || []).length}`);
    } catch (e: any) {
      setRegenErr(e?.message || "Error regenerando");
    } finally {
      setRegenLoading(false);
    }
  }

  async function desactivar(tf: TurnoFijoRow) {
    if (!idClub) return;
    const ok = confirm(`¿Desactivar el turno fijo #${tf.id_turno_fijo} y cancelar instancias futuras?`);
    if (!ok) return;

    const res = await fetch(`/api/admin/turnos-fijos/${tf.id_turno_fijo}/desactivar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_club: idClub,
        cancelar_futuras: true,
        incluir_hoy: true,
        motivo: "Turno fijo desactivado",
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      alert(json?.error || "No se pudo desactivar");
      return;
    }

    alert(`Desactivado. Canceladas: ${json.canceled_count || 0}`);
    await load();
  }

  function openExcepcion(tf: TurnoFijoRow) {
    setExcTurno(tf);
    setExcFecha(hoyISO);
    setExcAccion("skip");
    setExcNotas("");
    setExcErr(null);
    setExcOpen(true);
  }

  async function saveExcepcion() {
    if (!idClub || !excTurno) return;
    setExcLoading(true);
    setExcErr(null);
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(excFecha)) throw new Error("Fecha inválida (YYYY-MM-DD)");

      const payload: any = { id_club: idClub, fecha: excFecha, accion: excAccion, notas: excNotas.trim() || null };

      // En la global, por ahora dejamos “skip” rápido.
      if (excAccion === "override") {
        throw new Error("Override desde templates: por ahora no. Usá 'Saltar este día' o hacelo desde la vista por fecha.");
      }

      const res = await fetch(`/api/admin/turnos-fijos/${excTurno.id_turno_fijo}/excepciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar excepción");

      setExcOpen(false);
      alert("Excepción guardada.");
      await load();
    } catch (e: any) {
      setExcErr(e?.message || "Error guardando");
    } finally {
      setExcLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-black text-slate-800 text-xl">Turnos fijos (templates)</div>
          <div className="text-xs text-slate-500">
            Vista global de templates. Para ver “aplicables por fecha”, usá la vista normal.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/turnos-fijos"
            className="text-sm font-bold px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            Ver por fecha
          </Link>

          <button
            onClick={load}
            className="text-sm font-bold px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Recargar
          </button>
        </div>
      </div>

      <div className="p-4">
        {err ? <div className="mb-3 bg-white border border-red-200 rounded-xl p-3 text-sm text-red-700">{err}</div> : null}

        {!err && !idClub ? (
          <div className="grid place-items-center py-16 text-sm text-slate-600">Resolviendo club…</div>
        ) : null}

        {loading ? (
          <div className="grid place-items-center py-20 text-sm text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-700">{rows.length} template(s)</div>
            </div>

            <div className="divide-y">
              {rows.map((tf) => {
                const future = Number(tf.future_count || 0);
                const low = future < 4;

                return (
                  <div key={tf.id_turno_fijo} className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800">
                        #{tf.id_turno_fijo} · Cancha {tf.id_cancha} · {String(tf.inicio).slice(0, 5)} ({tf.duracion_min}m) ·{" "}
                        {fmtDow(tf.dow)}
                        {!tf.activo && <span className="ml-2 text-xs font-black text-red-600">INACTIVO</span>}
                      </div>

                      <div className="text-sm text-slate-600">
                        Cliente: {(tf.cliente_nombre || "—").toString()} · Tipo: {(tf.tipo_turno || "normal").toString()} · Futuras:{" "}
                        <span className={`font-bold ${low ? "text-amber-600" : "text-slate-800"}`}>{future}</span>
                        {low ? <span className="ml-2 text-xs font-bold text-amber-600">buffer bajo</span> : null}
                      </div>

                      <div className="text-xs text-slate-500">
                        Vigencia: {tf.start_date} {tf.end_date ? `→ ${tf.end_date}` : "(sin fin)"}
                        {tf.notas ? <span className="text-slate-400"> · </span> : null}
                        {tf.notas ? <span className="italic">{tf.notas}</span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openExcepcion(tf)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-bold hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Excepción
                      </button>

                      <button
                        onClick={() => openRegenerar(tf)}
                        className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50"
                        disabled={!tf.activo}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Regenerar
                      </button>

                      <button
                        onClick={() => desactivar(tf)}
                        className="px-3 py-2 rounded-xl bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 flex items-center gap-2"
                      >
                        <Ban className="w-4 h-4" />
                        Desactivar
                      </button>
                    </div>
                  </div>
                );
              })}

              {rows.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-600">No hay turnos fijos.</div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* MODAL REGENERAR */}
      {regenOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setRegenOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-5">
            <div className="font-black text-slate-800 text-lg mb-1">Regenerar semanas</div>
            <div className="text-sm text-slate-600 mb-4">
              Turno fijo #{regenTurno?.id_turno_fijo} · Cancha {regenTurno?.id_cancha} ·{" "}
              {String(regenTurno?.inicio || "").slice(0, 5)}
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-600 mb-1">Semanas a generar</div>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={regenWeeks}
                  onChange={(e) => setRegenWeeks(Number(e.target.value || 8))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              {regenErr ? (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{regenErr}</div>
              ) : null}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setRegenOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50"
                  disabled={regenLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={doRegenerar}
                  className="flex-1 rounded-xl bg-slate-900 text-white px-3 py-2 text-sm font-bold hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
                  disabled={regenLoading || !regenTurno}
                >
                  {regenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Generar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL EXCEPCIÓN (skip) */}
      {excOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setExcOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-5 overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <div className="text-lg font-bold text-gray-900">Excepción</div>
                <div className="text-sm text-gray-500">Turno fijo #{excTurno?.id_turno_fijo}</div>
              </div>
              <button
                onClick={() => setExcOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-700">Fecha</div>
                <input
                  type="date"
                  value={excFecha}
                  onChange={(e) => setExcFecha(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-700">Acción</div>
                <select
                  value={excAccion}
                  onChange={(e) => setExcAccion(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="skip">Saltar este día</option>
                  <option value="override">Override (no disponible acá)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-700">Notas</div>
                <textarea
                  value={excNotas}
                  onChange={(e) => setExcNotas(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Opcional"
                />
              </div>

              {excErr ? <div className="text-sm text-red-600">{excErr}</div> : null}
            </div>

            <div className="border-t pt-4 flex gap-3">
              <button
                onClick={() => setExcOpen(false)}
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50"
                disabled={excLoading}
              >
                Cancelar
              </button>
              <button
                onClick={saveExcepcion}
                className="flex-1 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                disabled={excLoading || !idClub || !excTurno}
              >
                {excLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
