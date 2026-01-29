"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CircleCheck, CircleX, Loader2, Plus, Power, RefreshCw } from "lucide-react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";

type CanchaLite = { id_cancha: number; nombre: string };

type AgendaApiResponseLite = {
  ok: boolean;
  id_club: number;
  fecha: string;
  canchas: CanchaLite[];
  // reservas etc no las necesitamos acá
  error?: string;
};

type TurnoFijo = {
  id_turno_fijo: number;
  id_club: number;
  id_cancha: number;
  dow: number;
  inicio: string; // HH:MM
  duracion_min: 60 | 90 | 120;
  fin: string | null;
  fin_dia_offset: 0 | 1;
  activo: boolean;
  segmento: string | null;
  tipo_turno: string;
  notas: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  start_date: string;
  end_date: string | null;
};

type ReservaInstancia = {
  id_reserva: number;
  id_turno_fijo: number | null;
  id_cancha: number;
  fecha: string;
  inicio: string;
  fin: string;
  fin_dia_offset: 0 | 1;
  estado: string;
  precio_total: number;
  monto_anticipo: number | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_email?: string | null;
  origen?: string | null;
};

type TurnosFijosGetResp = {
  ok: boolean;
  fecha: string | null;
  dow: number | null;
  data: TurnoFijo[];
  instancias: ReservaInstancia[];
  error?: string;
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

function addMinutesHHMM(hhmm: string, addMin: number) {
  const [h, m] = (hhmm || "").slice(0, 5).split(":").map(Number);
  let total = (h || 0) * 60 + (m || 0) + (addMin || 0);
  total = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function TurnosFijosPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const fechaISO = useMemo(() => toISODateAR(selectedDate), [selectedDate]);

  // Datos base (vienen del agenda endpoint)
  const [idClub, setIdClub] = useState<number | null>(null);
  const [canchas, setCanchas] = useState<CanchaLite[]>([]);

  // Turnos fijos
  const [turnos, setTurnos] = useState<TurnoFijo[]>([]);
  const [instancias, setInstancias] = useState<ReservaInstancia[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal excepción
  const [excOpen, setExcOpen] = useState(false);
  const [excTurno, setExcTurno] = useState<TurnoFijo | null>(null);

  const canchasMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of canchas) m.set(c.id_cancha, c.nombre);
    return m;
  }, [canchas]);

  const instByTurno = useMemo(() => {
    const m = new Map<number, ReservaInstancia[]>();
    for (const r of instancias) {
      const id = Number(r.id_turno_fijo || 0);
      if (!id) continue;
      const arr = m.get(id) ?? [];
      arr.push(r);
      m.set(id, arr);
    }
    return m;
  }, [instancias]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      // 1) Primero agenda: resuelve club por subdominio + devuelve canchas
      const agendaRes = await fetch(`/api/admin/agenda?fecha=${fechaISO}`, { cache: "no-store" });
      const agendaJson = (await agendaRes.json().catch(() => null)) as AgendaApiResponseLite | null;
      if (!agendaRes.ok || !agendaJson?.ok) throw new Error(agendaJson?.error || "No se pudo cargar agenda");

      setIdClub(agendaJson.id_club);
      setCanchas(agendaJson.canchas || []);

      // 2) Turnos fijos del día
      const tfRes = await fetch(
        `/api/admin/turnos-fijos?id_club=${agendaJson.id_club}&fecha=${fechaISO}`,
        { cache: "no-store" }
      );
      const tfJson = (await tfRes.json().catch(() => null)) as TurnosFijosGetResp | null;
      if (!tfRes.ok || !tfJson?.ok) throw new Error(tfJson?.error || "No se pudieron cargar turnos fijos");

      setTurnos(tfJson.data || []);
      setInstancias(tfJson.instancias || []);
    } catch (e: any) {
      setError(e?.message || "Error interno");
      setIdClub(null);
      setCanchas([]);
      setTurnos([]);
      setInstancias([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaISO]);

  function openExcepcion(t: TurnoFijo) {
    setExcTurno(t);
    setExcOpen(true);
  }

  async function desactivarTurnoFijo(t: TurnoFijo) {
    if (!idClub) return;
    if (!confirm("¿Desactivar este turno fijo? (cancelará instancias futuras si elegís que sí)")) return;

    try {
      const res = await fetch(`/api/admin/turnos-fijos/${t.id_turno_fijo}/desactivar`, {
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
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo desactivar");

      await loadAll();
      alert(`Desactivado. Canceladas: ${json.canceled_count || 0}`);
    } catch (e: any) {
      alert(e?.message || "Error desactivando");
    }
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 z-40 relative shadow-sm">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Turnos fijos</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Calendar className="h-4 w-4" />
            Fecha
          </div>
          <input
            type="date"
            value={fechaISO}
            onChange={(e) => setSelectedDate(new Date(`${e.target.value}T00:00:00`))}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/turnos-fijos/templates"
            className="bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <LayoutGrid className="w-4 h-4" />
            Ver templates
          </Link>

          <button
            onClick={loadAll}
            className="bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Recargar
          </button>
        </div>

      </header>

      <main className="flex-1 relative overflow-y-auto p-4">
        {loading && (
          <div className="h-[60vh] grid place-items-center text-sm text-slate-600">Cargando…</div>
        )}

        {!loading && error && (
          <div className="h-[60vh] grid place-items-center">
            <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm max-w-md w-full">
              <div className="font-bold text-red-700 mb-1">No se pudo cargar</div>
              <div className="text-sm text-slate-600">{error}</div>
              <button
                onClick={loadAll}
                className="mt-3 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">
                {turnos.length} turnos fijos aplicables para {fechaISO}
              </div>
              <div className="text-xs text-gray-500">
                “Creado” = existe una reserva en esa fecha con id_turno_fijo
              </div>
            </div>

            {turnos.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No hay turnos fijos aplicables para esta fecha.</div>
            ) : (
              <div className="divide-y">
                {turnos.map((t) => {
                  const canchaName = canchasMap.get(t.id_cancha) || `Cancha ${t.id_cancha}`;
                  const inst = instByTurno.get(t.id_turno_fijo) ?? [];
                  const creado = inst.length > 0;
                  const finCalc = t.fin || addMinutesHHMM(t.inicio, Number(t.duracion_min || 0));

                  return (
                    <div key={t.id_turno_fijo} className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-bold text-gray-900">
                              {t.inicio}–{finCalc} ({t.duracion_min}’)
                            </div>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                              {fmtDow(t.dow)}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                              {canchaName}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                              {t.tipo_turno}
                            </span>

                            {t.activo ? (
                              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
                                Activo
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                                Inactivo
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-gray-600">
                            Cliente: <span className="font-semibold">{t.cliente_nombre || "—"}</span>{" "}
                            <span className="text-gray-400">·</span> {t.cliente_telefono || "—"}
                          </div>

                          <div className="text-xs text-gray-500">
                            Vigencia: {t.start_date} → {t.end_date || "sin fin"}
                            {t.notas ? <span className="text-gray-400"> · </span> : null}
                            {t.notas ? <span className="italic">{t.notas}</span> : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {creado ? (
                            <div className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                              <CircleCheck className="h-4 w-4" /> Creado
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600">
                              <CircleX className="h-4 w-4" /> No creado
                            </div>
                          )}
                        </div>
                      </div>

                      {inst.length > 0 ? (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Instancias en {fechaISO}</div>
                          <div className="space-y-1">
                            {inst.map((r) => (
                              <div key={r.id_reserva} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="text-gray-700">
                                  #{r.id_reserva} · {r.inicio}–{r.fin} · <span className="font-semibold">{r.estado}</span>
                                </div>
                                <div className="text-gray-600">
                                  ${Number(r.precio_total || 0).toLocaleString("es-AR")}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openExcepcion(t)}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50"
                        >
                          <Plus className="h-4 w-4" />
                          Crear excepción
                        </button>

                        <button
                          onClick={() => desactivarTurnoFijo(t)}
                          disabled={!t.activo || !idClub}
                          className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-4 py-2 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-60"
                        >
                          <Power className="h-4 w-4" />
                          Desactivar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <ExcepcionModal
        isOpen={excOpen}
        onClose={() => setExcOpen(false)}
        turno={excTurno}
        fecha={fechaISO}
        idClub={idClub}
        canchas={canchas}
        onSaved={async () => {
          setExcOpen(false);
          await loadAll();
        }}
      />
    </div>
  );
}

function ExcepcionModal(props: {
  isOpen: boolean;
  onClose: () => void;
  turno: TurnoFijo | null;
  fecha: string;
  idClub: number | null;
  canchas: CanchaLite[];
  onSaved: () => void;
}) {
  const { isOpen, onClose, turno, fecha, idClub, canchas, onSaved } = props;

  const [accion, setAccion] = useState<"skip" | "override">("skip");
  const [inicio, setInicio] = useState<string>("");
  const [duracion, setDuracion] = useState<60 | 90 | 120>(90);
  const [canchaId, setCanchaId] = useState<string>("");
  const [notas, setNotas] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !turno) return;
    setAccion("skip");
    setInicio(turno.inicio || "");
    setDuracion((turno.duracion_min as any) || 90);
    setCanchaId(String(turno.id_cancha || ""));
    setNotas("");
    setErr(null);
  }, [isOpen, turno]);

  if (!isOpen || !turno) return null;

  async function save() {
  if (!idClub) return;
  const id_turno_fijo = turno?.id_turno_fijo;
  if (!id_turno_fijo) return; // ✅ evita null

  setErr(null);
  setLoading(true);
  try {
    const payload: any = { id_club: idClub, fecha, accion, notas: notas.trim() || null };

    if (accion === "override") {
      payload.inicio = inicio;
      payload.duracion_min = duracion;
      payload.id_cancha = Number(canchaId);
      if (!/^\d{2}:\d{2}$/.test(inicio)) throw new Error("Inicio inválido (HH:MM)");
      if (![60, 90, 120].includes(Number(duracion))) throw new Error("Duración inválida");
      if (!Number(payload.id_cancha)) throw new Error("Seleccioná cancha");
    }

    const res = await fetch(`/api/admin/turnos-fijos/${id_turno_fijo}/excepciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar");

    onSaved();
  } catch (e: any) {
    setErr(e?.message || "Error guardando");
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-5 overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b pb-3">
          <div>
            <div className="text-lg font-bold text-gray-900">Excepción</div>
            <div className="text-sm text-gray-500">
              Turno fijo #{turno.id_turno_fijo} · {fecha}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>

        <div className="py-4 space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-700">Acción</div>
            <select
              value={accion}
              onChange={(e) => setAccion(e.target.value as any)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="skip">Saltar este día</option>
              <option value="override">Override (solo este día)</option>
            </select>
          </div>

          {accion === "override" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-gray-700">Inicio</div>
                  <input
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    placeholder="HH:MM"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-gray-700">Duración</div>
                  <select
                    value={duracion}
                    onChange={(e) => setDuracion(Number(e.target.value) as any)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value={60}>60</option>
                    <option value={90}>90</option>
                    <option value={120}>120</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-700">Cancha</div>
                <select
                  value={canchaId}
                  onChange={(e) => setCanchaId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  {canchas.map((c) => (
                    <option key={c.id_cancha} value={String(c.id_cancha)}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-700">Notas</div>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="Opcional"
            />
          </div>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}
        </div>

        <div className="border-t pt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            disabled={loading || !idClub}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
