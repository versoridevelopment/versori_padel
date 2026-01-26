"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, RotateCw } from "lucide-react";

type Estado = "pendiente_pago" | "confirmada" | "expirada" | "rechazada";

// ✅ Esta es la función que no estabas usando
function isLocalHostName(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

function buildHostWithSubdomain(baseHost: string, club: string) {
  if (baseHost.startsWith(`${club}.`)) return baseHost;
  const host = baseHost.startsWith("www.") ? baseHost.slice(4) : baseHost;
  return `${club}.${host}`;
}

export default function PagoResultadoPage() {
  const params = useSearchParams();
  const router = useRouter();

  const id_reserva = Number(params.get("id_reserva"));
  const club = params.get("club") || null;

  const [estado, setEstado] = useState<Estado | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);

  const clubHomeUrl = useMemo(() => {
    if (!club) return null;
    if (typeof window === "undefined") return null;

    const { protocol, hostname, port } = window.location;

    // ✅ CORRECCIÓN AQUÍ: Usamos la función auxiliar isLocalHostName
    if (isLocalHostName(hostname)) {
      const targetHost = `${club}.localhost`;
      const target = `${protocol}//${targetHost}${port ? `:${port}` : ""}/`;
      return target;
    }

    if (hostname.includes("ngrok-free.dev")) {
      return `${protocol}//${hostname}/?club=${encodeURIComponent(club)}`;
    }

    const targetHost = buildHostWithSubdomain(hostname, club);
    return `${protocol}//${targetHost}${port ? `:${port}` : ""}/`;
  }, [club]);

  // ... (El resto del código sigue igual) ...
  
  // 🔁 Polling de estado de reserva
  useEffect(() => {
    if (!id_reserva) return;
    let alive = true;
    let timer: any = null;

    async function poll() {
      try {
        setPollError(null);
        const res = await fetch(`/api/reservas/${id_reserva}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok) {
          setPollError(data?.error || "No se pudo verificar el estado.");
          setLoading(false);
          timer = setTimeout(poll, 2500);
          return;
        }

        const nextEstado = (data?.estado || null) as Estado | null;
        setEstado(nextEstado);
        setLoading(false);

        if (nextEstado === "pendiente_pago") {
          timer = setTimeout(poll, 2500);
        }
      } catch (e: any) {
        if (!alive) return;
        setPollError(e?.message || "Error de red verificando estado.");
        setLoading(false);
        timer = setTimeout(poll, 2500);
      }
    }

    poll();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [id_reserva]);

  if (!id_reserva) {
    return <p className="text-white p-10">Reserva inválida</p>;
  }

  const showPending = loading && !estado;

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
      <div className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-10 max-w-md w-full text-center">
        {showPending && (
          <>
            <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verificando pago…</h1>
            <p className="text-neutral-300 mb-6">
              Estamos consultando el estado de la operación.
            </p>
          </>
        )}

        {!showPending && pollError && (
          <>
            <RotateCw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Estamos verificando</h1>
            <p className="text-neutral-300 mb-6">{pollError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
            >
              Reintentar
            </button>
          </>
        )}

        {!showPending && !pollError && estado === "confirmada" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Reserva confirmada</h1>
            <p className="text-neutral-300 mb-6">
              El pago fue aprobado correctamente.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/mis-reservas")}
                className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-xl font-semibold"
              >
                Ver mis reservas
              </button>

              {clubHomeUrl && (
                <button
                  onClick={() => (window.location.href = clubHomeUrl)}
                  className="bg-gray-700/70 hover:bg-gray-600 px-6 py-3 rounded-xl font-semibold"
                >
                  Volver al club
                </button>
              )}
            </div>
          </>
        )}

        {!showPending && !pollError && estado === "pendiente_pago" && (
          <>
            <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pago pendiente</h1>
            <p className="text-neutral-300 mb-6">
              Estamos esperando confirmación del pago.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
            >
              Actualizar
            </button>
          </>
        )}

        {!showPending && !pollError && estado === "rechazada" && (
          <>
            <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pago rechazado</h1>
            <p className="text-neutral-300 mb-6">
              El pago no pudo completarse.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/reserva")}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
              >
                Reintentar reserva
              </button>

              {clubHomeUrl && (
                <button
                  onClick={() => (window.location.href = clubHomeUrl)}
                  className="bg-gray-700/70 hover:bg-gray-600 px-6 py-3 rounded-xl font-semibold"
                >
                  Volver al club
                </button>
              )}
            </div>
          </>
        )}

        {!showPending && !pollError && estado === "expirada" && (
          <>
            <RotateCw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Reserva expirada</h1>
            <p className="text-neutral-300 mb-6">
              No se recibió el pago a tiempo.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/reserva")}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
              >
                Volver a reservar
              </button>

              {clubHomeUrl && (
                <button
                  onClick={() => (window.location.href = clubHomeUrl)}
                  className="bg-gray-700/70 hover:bg-gray-600 px-6 py-3 rounded-xl font-semibold"
                >
                  Volver al club
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}