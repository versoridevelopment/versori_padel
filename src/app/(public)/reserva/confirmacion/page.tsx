"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  RotateCw,
} from "lucide-react";
import Image from "next/image";

type DraftSnapshot = {
  id_club: number;
  id_cancha: number;
  user_id: string | null;
  segmento: "publico" | "profe";
  fecha: string; // YYYY-MM-DD (fecha del inicio)
  inicio: string; // HH:MM
  fin: string; // HH:MM (puede ser del día siguiente)
  duracion_min: number;
  id_tarifario: number;
  id_regla: number;
  precio_total: number;
  created_at: string;
};

type PreviewAnticipoOk = {
  ok: true;
  precio_total: number;
  anticipo_porcentaje: number;
  monto_anticipo: number;
  segmento?: "publico" | "profe" | null;
};

type PreviewAnticipoErr = { error: string };

type CheckoutOk = {
  ok: true;
  id_reserva: number;
  expires_at: string; // ISO
  precio_total: number;
  anticipo_porcentaje: number;
  monto_anticipo: number;
  checkout_url: string;
  fin_dia_offset?: 0 | 1;
};

type ContextoUI = {
  club_nombre: string | null;
  cancha_nombre: string | null;
};

type RestoreResp =
  | {
      ok: true;
      id_reserva: number;
      id_pago: number;
      expires_at: string;
      checkout_url: string;
      fin_dia_offset?: 0 | 1;
    }
  | { ok: false; reason: string; detail?: string };

function formatFechaAR(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function msToMMSS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function moneyAR(n: number) {
  return Number(n || 0).toLocaleString("es-AR");
}

// ✅ Key estable del draft para recordar si el usuario ya inició checkout para este slot
function draftKey(d: DraftSnapshot) {
  return `${d.id_club}|${d.id_cancha}|${d.fecha}|${d.inicio}|${d.fin}`;
}
function lsKey(d: DraftSnapshot) {
  return `checkout_started_v1:${draftKey(d)}`;
}

function ConfirmacionTurno() {
  const router = useRouter();

  const [draft, setDraft] = useState<DraftSnapshot | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  const [preview, setPreview] = useState<PreviewAnticipoOk | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [checkout, setCheckout] = useState<CheckoutOk | null>(null);
  const [creatingCheckout, setCreatingCheckout] = useState(false);

  const [contexto, setContexto] = useState<ContextoUI>({
    club_nombre: null,
    cancha_nombre: null,
  });
  const [loadingContexto, setLoadingContexto] = useState(false);

  const [restoring, setRestoring] = useState(false);

  // ✅ indica si el usuario ya había iniciado checkout alguna vez para ESTE draft/slot
  const [hadStartedCheckout, setHadStartedCheckout] = useState(false);

  // Countdown
  const expiresAtMs = checkout?.expires_at
    ? new Date(checkout.expires_at).getTime()
    : null;
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (!expiresAtMs) return;
    const t = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
  }, [expiresAtMs]);

  const remainingMs = useMemo(() => {
    if (!expiresAtMs) return null;
    return expiresAtMs - nowMs;
  }, [expiresAtMs, nowMs]);

  const expired = remainingMs != null && remainingMs <= 0;

  const horas = useMemo(() => {
    if (!draft?.duracion_min) return 0;
    return draft.duracion_min / 60;
  }, [draft]);

  const fechaTexto = useMemo(() => {
    if (!draft?.fecha) return "";
    return formatFechaAR(draft.fecha);
  }, [draft]);

  function readCheckoutStartedFlag(d: DraftSnapshot) {
    try {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem(lsKey(d)) === "1";
    } catch {
      return false;
    }
  }

  function markCheckoutStarted(d: DraftSnapshot) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(lsKey(d), "1");
    } catch {
      // ignore
    }
  }

  function clearCheckoutStarted(d: DraftSnapshot) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(lsKey(d));
    } catch {
      // ignore
    }
  }

  async function loadDraft() {
    setLoadingDraft(true);
    setWarning(null);

    try {
      const res = await fetch("/api/reservas/draft", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      const d = (data?.draft ?? null) as DraftSnapshot | null;
      if (!d) {
        setDraft(null);
        setPreview(null);
        setCheckout(null);
        setContexto({ club_nombre: null, cancha_nombre: null });
        setHadStartedCheckout(false);
        setWarning("No hay una reserva en curso. Volvé a seleccionar un horario.");
        return;
      }

      setDraft(d);
      setHadStartedCheckout(readCheckoutStartedFlag(d));
      // No reseteamos checkout acá; si venías de MP queremos restaurar.
    } catch (e: any) {
      setWarning(e?.message || "Error cargando el borrador");
    } finally {
      setLoadingDraft(false);
    }
  }

  async function loadContexto() {
    setLoadingContexto(true);
    try {
      const res = await fetch("/api/reservas/contexto", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setContexto({ club_nombre: null, cancha_nombre: null });
        return;
      }

      setContexto({
        club_nombre: data?.club_nombre ?? null,
        cancha_nombre: data?.cancha_nombre ?? null,
      });
    } catch {
      setContexto({ club_nombre: null, cancha_nombre: null });
    } finally {
      setLoadingContexto(false);
    }
  }

  async function loadPreviewAnticipo() {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/reservas/preview-anticipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setPreview(null);
        setWarning((data as PreviewAnticipoErr)?.error || "No se pudo calcular el anticipo");
        return;
      }

      setPreview(data as PreviewAnticipoOk);
    } catch (e: any) {
      setPreview(null);
      setWarning(e?.message || "Error de red calculando anticipo");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function tryRestoreCheckout() {
    if (restoring) return;
    if (!draft) return;
    if (!preview) return;
    if (checkout) return;

    // ✅ IMPORTANTÍSIMO: solo restaurar si el usuario ya había iniciado checkout para este slot
    if (!hadStartedCheckout) return;

    setRestoring(true);
    try {
      const res = await fetch("/api/reservas/checkout/restore", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as RestoreResp | null;

      if (data?.ok) {
        const restored: CheckoutOk = {
          ok: true,
          id_reserva: data.id_reserva,
          expires_at: data.expires_at,
          checkout_url: data.checkout_url,
          fin_dia_offset: data.fin_dia_offset,
          precio_total: preview.precio_total ?? draft.precio_total,
          anticipo_porcentaje: preview.anticipo_porcentaje ?? 0,
          monto_anticipo: preview.monto_anticipo ?? 0,
        };
        setCheckout(restored);
        setWarning(null);
        return;
      }

      // ✅ Refinamiento: avisar expiración SOLO si había iniciado checkout
      if (data && !data.ok) {
        if (data.reason === "expired" || data.reason === "no_hold") {
          setWarning("La reserva expiró o se liberó. Reintentá para generar un nuevo pago.");
          setCheckout(null);
          // limpiamos flag porque ya no hay nada que restaurar
          clearCheckoutStarted(draft);
          setHadStartedCheckout(false);
        }
      }
    } catch {
      // no bloqueamos UI
    } finally {
      setRestoring(false);
    }
  }

  // Cargar draft al entrar
  useEffect(() => {
    let alive = true;
    (async () => {
      await loadDraft();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando hay draft: cargar contexto (nombres) y preview (anticipo)
  useEffect(() => {
    if (!draft) return;
    loadContexto();
    loadPreviewAnticipo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id_club, draft?.id_cancha, draft?.fecha, draft?.inicio, draft?.fin]);

  // ✅ Auto-restore (solo si hadStartedCheckout)
  useEffect(() => {
    if (!draft) return;
    if (!preview) return;
    tryRestoreCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, preview, hadStartedCheckout]);

  const canConfirm = useMemo(() => {
    return (
      !!draft &&
      !!preview &&
      !loadingDraft &&
      !loadingPreview &&
      !creatingCheckout
    );
  }, [draft, preview, loadingDraft, loadingPreview, creatingCheckout]);

  const showPayButton = !!checkout && !expired;

  const tituloLugar = useMemo(() => {
    const canchaNombre = contexto.cancha_nombre;
    const clubNombre = contexto.club_nombre;

    if (canchaNombre && clubNombre) return `${canchaNombre} — ${clubNombre}`;
    if (canchaNombre) return canchaNombre;
    if (clubNombre) return clubNombre;

    return `Cancha #${draft?.id_cancha ?? "?"} (club #${draft?.id_club ?? "?"})`;
  }, [contexto.cancha_nombre, contexto.club_nombre, draft?.id_cancha, draft?.id_club]);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-10 w-full max-w-xl shadow-2xl text-center"
      >
        {/* Header */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-col items-center gap-3"
        >
          <Image
            src="/sponsors/versori/VERSORI_TRANSPARENTE.PNG"
            alt="Versori Logo"
            width={150}
            height={150}
            className="opacity-90"
          />
          <h1 className="text-3xl font-bold text-white">Confirmación de turno</h1>
          <p className="text-neutral-400 text-sm">
            Revisá los detalles antes de finalizar tu reserva
          </p>
        </motion.div>

        {loadingDraft ? (
          <p className="text-neutral-300">Cargando…</p>
        ) : !draft ? (
          <div className="text-left bg-[#112d57] rounded-2xl p-6">
            <div className="flex items-center gap-2 text-yellow-300">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-semibold">{warning ?? "Sin draft"}</p>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => router.push("/reserva")}
                className="flex items-center justify-center gap-2 bg-gray-700/70 hover:bg-gray-600 transition-all px-6 py-3 rounded-xl text-white font-semibold"
              >
                <ArrowLeft className="w-5 h-5" /> Volver
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Detalles */}
            <div className="mt-6 space-y-4 text-left bg-[#112d57] rounded-2xl p-6">
              <div className="flex items-center gap-3 text-blue-300">
                <MapPin className="w-5 h-5 text-blue-400" />
                <div className="flex flex-col">
                  <p className="font-semibold">{tituloLugar}</p>
                  {loadingContexto && (
                    <span className="text-xs text-neutral-400">
                      Cargando nombres…
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-blue-300">
                <Calendar className="w-5 h-5 text-blue-400" />
                <p className="text-neutral-300">{fechaTexto}</p>
              </div>

              <div className="flex items-center gap-3 text-blue-300">
                <Clock className="w-5 h-5 text-blue-400" />
                <p>
                  {horas.toFixed(1)} horas —{" "}
                  <span className="text-neutral-300">
                    de{" "}
                    <span className="text-white font-semibold">
                      {draft.inicio}
                    </span>{" "}
                    a{" "}
                    <span className="text-white font-semibold">{draft.fin}</span>
                  </span>
                </p>
              </div>

              <hr className="border-blue-900/60 my-4" />

              <div className="flex justify-between items-center">
                <p className="text-neutral-300">
                  Total:{" "}
                  <span className="text-white font-semibold">
                    ${moneyAR(preview?.precio_total ?? draft.precio_total)}
                  </span>
                </p>
              </div>

              {/* Preview anticipo */}
              <div className="flex justify-between items-center mt-2">
                <p className="text-neutral-300">
                  Anticipo{" "}
                  {loadingPreview ? (
                    <span className="text-neutral-500">(calculando…)</span>
                  ) : preview ? (
                    <span className="text-neutral-500">
                      ({preview.anticipo_porcentaje}%)
                    </span>
                  ) : (
                    <span className="text-neutral-500">(no disponible)</span>
                  )}
                  :
                </p>

                <p className="text-lg font-semibold text-yellow-400">
                  {loadingPreview
                    ? "…"
                    : preview
                    ? `$${moneyAR(preview.monto_anticipo)}`
                    : "-"}
                </p>
              </div>

              {/* Checkout state */}
              {checkout ? (
                <div className="mt-3 text-sm text-neutral-300">
                  Reserva pendiente:{" "}
                  <span className="font-semibold">#{checkout.id_reserva}</span>
                  <span className="ml-2 text-neutral-400">
                    {expired
                      ? "(expirada)"
                      : expiresAtMs
                      ? `(expira en ${msToMMSS(remainingMs ?? 0)})`
                      : ""}
                  </span>
                </div>
              ) : (
                <p className="text-gray-400 text-xs mt-2 italic">
                  *El horario se bloqueará temporalmente recién cuando confirmes
                  e inicies el pago del anticipo.
                </p>
              )}
            </div>

            {/* Mensajes */}
            {warning && (
              <div className="mt-4 flex items-center gap-2 text-yellow-300 justify-center">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm">{warning}</p>
              </div>
            )}

            {/* Botones */}
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => router.push("/reserva")}
                className="flex items-center justify-center gap-2 bg-gray-700/70 hover:bg-gray-600 transition-all px-6 py-3 rounded-xl text-white font-semibold"
                disabled={creatingCheckout}
              >
                <ArrowLeft className="w-5 h-5" /> Volver
              </button>

              {showPayButton ? (
                <button
                  onClick={() => {
                    window.location.href = checkout!.checkout_url;
                  }}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-all px-6 py-3 rounded-xl text-white font-semibold"
                >
                  Ir a pagar <CreditCard className="w-5 h-5" />
                </button>
              ) : expired ? (
                <button
                  onClick={async () => {
                    setCheckout(null);
                    setWarning(null);
                    await loadPreviewAnticipo();
                    await tryRestoreCheckout();
                  }}
                  className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 transition-all px-6 py-3 rounded-xl text-white font-semibold"
                >
                  Reintentar <RotateCw className="w-5 h-5" />
                </button>
              ) : (
                <button
                  disabled={!canConfirm}
                  onClick={async () => {
                    setWarning(null);
                    setCreatingCheckout(true);

                    try {
                      const res = await fetch("/api/reservas/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                      });

                      const data = await res.json().catch(() => null);

                      if (!res.ok) {
                        setCheckout(null);
                        setWarning(data?.error || "No se pudo iniciar el checkout");
                        return;
                      }

                      const ck = data as CheckoutOk;
                      setCheckout(ck);

                      // ✅ Marcamos que para este draft ya se inició checkout.
                      // Esto habilita restore y el warning de expiración “solo cuando corresponde”.
                      markCheckoutStarted(draft);
                      setHadStartedCheckout(true);
                    } catch (e: any) {
                      setCheckout(null);
                      setWarning(e?.message || "Error de red iniciando checkout");
                    } finally {
                      setCreatingCheckout(false);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 transition-all px-6 py-3 rounded-xl text-white font-semibold ${
                    canConfirm
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-gray-600 cursor-not-allowed text-gray-300"
                  }`}
                >
                  {creatingCheckout
                    ? "Creando…"
                    : restoring
                    ? "Restaurando…"
                    : "Confirmar (bloquear) y generar pago"}
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Acciones secundarias */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={async () => {
                  await loadDraft();
                  await tryRestoreCheckout();
                }}
                className="text-xs text-blue-200/70 hover:text-blue-100 underline underline-offset-4"
              >
                Actualizar datos
              </button>
            </div>
          </>
        )}
      </motion.div>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-white text-center mt-20">Cargando...</p>}>
      <ConfirmacionTurno />
    </Suspense>
  );
}
