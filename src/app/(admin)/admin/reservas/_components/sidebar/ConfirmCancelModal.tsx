"use client";

import { useEffect, useMemo, useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo?: string | null) => void;
  loading?: boolean;
}

export default function ConfirmCancelModal({
  open,
  onClose,
  onConfirm,
  loading,
}: Props) {
  // ✅ Hooks SIEMPRE arriba (nunca detrás de un return condicional)
  const motivos = useMemo(
    () => [
      { id: "lluvia", label: "Cancela por lluvia / clima" },
      { id: "lesion", label: "Lesión / enfermedad" },
      { id: "sin_gente", label: "No consiguió jugadores" },
      { id: "error_horario", label: "Se equivocó de día / horario" },
      { id: "cambio_planes", label: "Cambio de planes" },
      { id: "problema_pago", label: "Problema con el pago" },
      { id: "mantenimiento", label: "Cancha cerrada / mantenimiento" },
      { id: "otro", label: "Otro (especificar)" },
    ],
    [],
  );

  const [selectedId, setSelectedId] = useState<string>("lluvia");
  const [detalle, setDetalle] = useState<string>("");

  // Reset cuando se abre
  useEffect(() => {
    if (open) {
      setSelectedId("lluvia");
      setDetalle("");
    }
  }, [open]);

  const selectedLabel =
    motivos.find((m) => m.id === selectedId)?.label ?? "";

  const isOtro = selectedId === "otro";

  function buildMotivoFinal(): string | null {
    const d = detalle.trim();

    // Si eligió "Otro", el texto manual ES el motivo
    if (isOtro) return d ? d : null;

    // Si eligió predefinido, devolvemos label + (detalle opcional)
    if (!selectedLabel) return null;
    return d ? `${selectedLabel} — ${d}` : selectedLabel;
  }

  // ✅ Recién acá decidimos render
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 text-slate-400 disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-rose-100 text-rose-600 p-2 rounded-full">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Cancelar reserva
          </h3>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          ¿Estás seguro de que querés cancelar esta reserva?
          <br />
          Esta acción <b>no se puede deshacer</b>.
        </p>

        {/* Motivos (1 solo) */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Motivo</p>

          <div className="space-y-2">
            {motivos.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition
                  ${
                    selectedId === m.id
                      ? "border-rose-300 bg-rose-50/40"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
              >
                <input
                  type="radio"
                  name="motivo_cancelacion"
                  value={m.id}
                  checked={selectedId === m.id}
                  onChange={() => setSelectedId(m.id)}
                  disabled={loading}
                  className="h-4 w-4"
                />
                <span className="text-sm text-slate-700">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Texto manual / detalle */}
        <textarea
          placeholder={isOtro ? "Escribí el motivo..." : "Detalle adicional (opcional)"}
          className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          rows={3}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          disabled={loading}
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
          >
            Volver
          </button>

          <button
            onClick={() => onConfirm(buildMotivoFinal())}
            disabled={loading || (isOtro && !detalle.trim())}
            className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-60"
            title={isOtro && !detalle.trim() ? "Escribí el motivo para continuar" : undefined}
          >
            {loading ? "Cancelando..." : "Sí, cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}
