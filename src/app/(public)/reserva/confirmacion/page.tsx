"use client";

import { Suspense, useEffect, useMemo, useState, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  CreditCard,
  RotateCw,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// --- TIPOS EXISTENTES ---
type DraftSnapshot = {
  id_club: number;
  id_cancha: number;
  user_id: string | null;
  segmento: "publico" | "profe";
  fecha: string;
  inicio: string;
  fin: string;
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

// ✅ NUEVO: respuesta del checkout (MP o cero)
type CheckoutResp = {
  ok: true;
  flow: "mp" | "zero";
  payment_required: boolean;
  redirect_url: string;

  id_reserva: number;
  id_pago: number | null;
  expires_at: string | null;

  // compat (tu backend lo devuelve igual)
  checkout_url: string;

  precio_total: number;
  anticipo_porcentaje: number;
  monto_anticipo: number;
  fin_dia_offset?: 0 | 1;
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

// --- BRANDING ---
type ClubBranding = {
  nombre: string | null;
  color_primario: string | null;
  color_secundario: string | null;
  logo_url: string | null;
  imagen_hero_url: string | null;
};

type ContextoUI = {
  club_nombre: string | null;
  cancha_nombre: string | null;
} & ClubBranding;

// --- HELPERS ---
function formatFechaAR(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

function draftKey(d: DraftSnapshot) {
  return `${d.id_club}|${d.id_cancha}|${d.fecha}|${d.inicio}|${d.fin}`;
}
function lsKey(d: DraftSnapshot) {
  return `checkout_started_v1:${draftKey(d)}`;
}

function ConfirmacionTurno() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [draft, setDraft] = useState<DraftSnapshot | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  const [preview, setPreview] = useState<PreviewAnticipoOk | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ✅ solo lo usamos para MP (cuando hay expires_at + checkout_url a /pago/iniciar)
  const [checkout, setCheckout] = useState<CheckoutResp | null>(null);
  const [creatingCheckout, setCreatingCheckout] = useState(false);

  const [contexto, setContexto] = useState<ContextoUI>({
    club_nombre: null,
    cancha_nombre: null,
    nombre: null,
    color_primario: null,
    color_secundario: null,
    logo_url: null,
    imagen_hero_url: null,
  });
  const [loadingContexto, setLoadingContexto] = useState(false);

  const [restoring, setRestoring] = useState(false);
  const [hadStartedCheckout, setHadStartedCheckout] = useState(false);

  // Countdown (solo MP)
  const expiresAtMs =
    checkout?.payment_required && checkout?.expires_at
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

  const horas = useMemo(() => (draft?.duracion_min ? draft.duracion_min / 60 : 0), [draft]);
  const fechaTexto = useMemo(() => (draft?.fecha ? formatFechaAR(draft.fecha) : ""), [draft]);

  const anticipoZero = (preview?.monto_anticipo ?? 0) <= 0;

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
    } catch {}
  }

  function clearCheckoutStarted(d: DraftSnapshot) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(lsKey(d));
    } catch {}
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
        setContexto((prev) => ({ ...prev, club_nombre: null, cancha_nombre: null, nombre: null }));
        setHadStartedCheckout(false);
        setWarning("No hay una reserva en curso. Volvé a seleccionar un horario.");
        return;
      }

      setDraft(d);
      setHadStartedCheckout(readCheckoutStartedFlag(d));
    } catch (e: any) {
      setWarning(e?.message || "Error cargando el borrador");
    } finally {
      setLoadingDraft(false);
    }
  }

  async function loadContextoAndBranding() {
    if (!draft?.id_club) return;
    setLoadingContexto(true);

    try {
      const resContext = await fetch("/api/reservas/contexto", { cache: "no-store" });
      const dataContext = await resContext.json().catch(() => null);

      const { data: clubData, error } = await supabase
        .from("clubes")
        .select("nombre, color_primario, color_secundario, logo_url, imagen_hero_url")
        .eq("id_club", draft.id_club)
        .single();

      if (error) console.error("Error fetching branding:", error);

      setContexto({
        club_nombre: dataContext?.club_nombre ?? null,
        cancha_nombre: dataContext?.cancha_nombre ?? null,
        nombre: clubData?.nombre ?? dataContext?.club_nombre ?? null,
        color_primario: clubData?.color_primario ?? "#3b82f6",
        color_secundario: clubData?.color_secundario ?? "#1e40af",
        logo_url: clubData?.logo_url ?? null,
        imagen_hero_url: clubData?.imagen_hero_url ?? null,
      });
    } catch {
      // fallback silencioso
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
    // ✅ restore solo aplica cuando hay anticipo > 0 (MP)
    if (anticipoZero) return;
    if (restoring || !draft || !preview || checkout || !hadStartedCheckout) return;

    setRestoring(true);
    try {
      const res = await fetch("/api/reservas/checkout/restore", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as RestoreResp | null;

      if (data?.ok) {
        const restored: CheckoutResp = {
          ok: true,
          flow: "mp",
          payment_required: true,
          redirect_url: data.checkout_url,

          id_reserva: data.id_reserva,
          id_pago: data.id_pago,
          expires_at: data.expires_at,

          checkout_url: data.checkout_url,

          precio_total: preview.precio_total ?? draft.precio_total,
          anticipo_porcentaje: preview.anticipo_porcentaje ?? 0,
          monto_anticipo: preview.monto_anticipo ?? 0,
          fin_dia_offset: data.fin_dia_offset,
        };

        setCheckout(restored);
        setWarning(null);
        return;
      }

      if (data && !data.ok) {
        if (data.reason === "expired" || data.reason === "no_hold") {
          setWarning("La reserva expiró o se liberó. Reintentá para generar un nuevo pago.");
          setCheckout(null);
          clearCheckoutStarted(draft);
          setHadStartedCheckout(false);
        }
      }
    } catch {
    } finally {
      setRestoring(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadDraft();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!draft) return;
    loadContextoAndBranding();
    loadPreviewAnticipo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id_club, draft?.id_cancha, draft?.fecha, draft?.inicio, draft?.fin]);

  // ✅ si anticipo es 0, limpiamos cualquier “checkout started” y no restauramos MP
  useEffect(() => {
    if (!draft || !preview) return;

    if ((preview?.monto_anticipo ?? 0) <= 0) {
      setCheckout(null);
      clearCheckoutStarted(draft);
      setHadStartedCheckout(false);
      return;
    }

    tryRestoreCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, preview, hadStartedCheckout]);

  const canConfirm = useMemo(() => {
    return !!draft && !!preview && !loadingDraft && !loadingPreview && !creatingCheckout;
  }, [draft, preview, loadingDraft, loadingPreview, creatingCheckout]);

  // ✅ MP: mostramos botón “Pagar seña…” solo cuando el checkout es MP y no expiró
  const showMpPayButton = !!checkout && checkout.payment_required && !expired;

  const customStyle = {
    "--primary": contexto.color_primario || "#3b82f6",
    "--secondary": contexto.color_secundario || "#1e40af",
  } as CSSProperties;

  return (
    <section
      style={customStyle}
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[var(--primary)]/30 text-white px-4 pt-32 pb-12 sm:pt-40 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[var(--primary)] rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--secondary)] rounded-full blur-[150px] opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          {contexto.logo_url ? (
            <div className="w-24 h-24 relative mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Image src={contexto.logo_url} alt="Club Logo" fill className="object-contain" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
              <ShieldCheck className="w-10 h-10 text-[var(--primary)]" />
            </div>
          )}

          <h1 className="text-3xl font-bold text-center tracking-tight">Confirmación de Turno</h1>
          <p className="text-neutral-400 text-sm mt-1">Revisá los detalles antes de confirmar</p>
        </div>

        <div className="bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
          {showMpPayButton && (
            <div
              className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 z-20 transition-all duration-1000"
              style={{ width: `${(remainingMs! / (15 * 60 * 1000)) * 100}%` }}
            />
          )}

          <div className="p-6 sm:p-8">
            {loadingDraft ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-neutral-400 text-sm animate-pulse">Cargando reserva...</p>
              </div>
            ) : !draft ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Reserva no encontrada</h3>
                <p className="text-neutral-400 text-sm mb-6 max-w-xs mx-auto">
                  {warning ?? "No hay datos disponibles"}
                </p>
                <button
                  onClick={() => router.push("/reserva")}
                  className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors"
                >
                  Volver al inicio
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="p-3 bg-[var(--primary)]/10 rounded-xl">
                      <MapPin className="w-6 h-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-0.5">
                        Ubicación
                      </p>
                      <h3 className="text-lg font-semibold text-white leading-tight">
                        {contexto.cancha_nombre || `Cancha #${draft.id_cancha}`}
                      </h3>
                      <p className="text-neutral-400 text-sm mt-0.5">
                        {contexto.club_nombre || `Club #${draft.id_club}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <Calendar className="w-5 h-5 text-neutral-400" />
                      <div className="flex flex-col">
                        <span className="text-xs text-neutral-500 font-medium uppercase">Fecha</span>
                        <span className="text-white capitalize font-medium">{fechaTexto}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <Clock className="w-5 h-5 text-neutral-400" />
                      <div className="flex flex-col">
                        <span className="text-xs text-neutral-500 font-medium uppercase">Horario</span>
                        <span className="text-white font-medium">
                          {draft.inicio} <span className="text-neutral-600 px-1">-</span> {draft.fin}
                          <span className="text-xs text-neutral-500 ml-1 font-normal">({horas}h)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/10 my-2" />

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">Valor total del turno</span>
                      <span className="text-white font-medium text-lg">
                        ${moneyAR(preview?.precio_total ?? draft.precio_total)}
                      </span>
                    </div>

                    <div className="flex justify-between items-end mt-2 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          Seña a pagar
                          {preview && (
                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded ml-1 border border-emerald-500/20">
                              {preview.anticipo_porcentaje}%
                            </span>
                          )}
                        </span>
                        <p className="text-[10px] text-neutral-500 max-w-[180px] leading-tight mt-0.5">
                          {anticipoZero
                            ? "No requiere seña. Se confirma directamente."
                            : "El resto se abona en el club antes de jugar."}
                        </p>
                      </div>

                      <div className="text-right">
                        {loadingPreview ? (
                          <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
                        ) : preview ? (
                          <span className="text-3xl font-bold text-emerald-400 tracking-tight block">
                            ${moneyAR(preview.monto_anticipo)}
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-sm">--</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {warning && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-200/90">{warning}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {showMpPayButton && (
                    <div className="flex justify-center items-center gap-2 text-xs text-neutral-400 bg-white/5 py-2 rounded-lg">
                      <Clock className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                      Tu reserva está reservada por{" "}
                      <span className="text-emerald-400 font-mono font-medium">
                        {msToMMSS(remainingMs ?? 0)}
                      </span>{" "}
                      minutos
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  {/* ✅ MP: si ya hay checkout MP vigente, mostramos “Pagar seña…” */}
                  {showMpPayButton ? (
                    <button
                      onClick={() => {
                        window.location.href = checkout!.checkout_url; // /pago/iniciar...
                      }}
                      className="group w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
                    >
                      Pagar Seña con Mercado Pago
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : expired ? (
                    <button
                      onClick={async () => {
                        setCheckout(null);
                        setWarning(null);
                        await loadPreviewAnticipo();
                        await tryRestoreCheckout();
                      }}
                      className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <RotateCw className="w-5 h-5" /> Reactivar Reserva
                    </button>
                  ) : (
                    // ✅ BOTÓN PRINCIPAL: si anticipo 0 => confirma y redirige a resultado
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
                          const data = (await res.json().catch(() => null)) as CheckoutResp | any;

                          if (!res.ok || !data?.ok) {
                            setCheckout(null);
                            setWarning(data?.error || "Error al confirmar");
                            return;
                          }

                          // ✅ CASO anticipo 0: NO mostrar botón MP, redirigir directo a resultado
                          if (data.payment_required === false) {
                            if (draft) clearCheckoutStarted(draft);
                            setHadStartedCheckout(false);
                            setCheckout(null);
                            window.location.href = data.redirect_url; // /pago/resultado?...
                            return;
                          }

                          // ✅ CASO MP: guardar checkout y marcar restore
                          setCheckout(data as CheckoutResp);
                          if (draft) markCheckoutStarted(draft);
                          setHadStartedCheckout(true);
                        } catch (e: any) {
                          setCheckout(null);
                          setWarning(e?.message || "Error de conexión");
                        } finally {
                          setCreatingCheckout(false);
                        }
                      }}
                      className={`
                        w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 relative overflow-hidden
                        ${
                          canConfirm
                            ? "bg-[var(--primary)] hover:brightness-110 text-white shadow-[var(--primary)]/30"
                            : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5"
                        }
                      `}
                    >
                      {creatingCheckout ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                          Procesando...
                        </span>
                      ) : restoring ? (
                        "Restaurando..."
                      ) : anticipoZero ? (
                        <>
                          Confirmar Reserva <CheckCircle2 className="w-5 h-5" />
                        </>
                      ) : (
                        <>
                          Ir a Pagar <CreditCard className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  )}

                  <button
                    disabled={creatingCheckout}
                    onClick={() => router.push("/reserva")}
                    className="w-full py-3 rounded-xl hover:bg-white/5 text-neutral-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    Cancelar y volver
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-6 flex justify-center gap-4 opacity-50">
          <Image
            src="/sponsors/versori/VERSORI_TRANSPARENTE.PNG"
            alt="Versori"
            width={80}
            height={30}
            className="grayscale hover:grayscale-0 transition-all"
          />
        </div>
      </motion.div>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <ConfirmacionTurno />
    </Suspense>
  );
}
