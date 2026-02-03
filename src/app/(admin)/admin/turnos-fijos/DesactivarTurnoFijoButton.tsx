"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  idClub: number;
  idTurnoFijo: number;
}

export function DesactivarTurnoFijoButton({ idClub, idTurnoFijo }: Props) {
  const [loading, setLoading] = useState(false);
  const r = useRouter();

  const onClick = async () => {
    const ok = confirm(
      "¿Desactivar turno fijo?\n\nEsto lo marca como inactivo y cancela reservas futuras asociadas.",
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/turnos-fijos/${idTurnoFijo}/desactivar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_club: idClub,
            cancelar_futuras: true,
            incluir_hoy: true,
            motivo: "Turno fijo desactivado",
          }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Error desactivando");
      r.refresh();
    } catch (e: any) {
      alert(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading}
      onClick={onClick}
      className="rounded-xl bg-red-600 text-white px-3 py-2 text-sm font-bold hover:bg-red-700 disabled:opacity-60"
    >
      {loading ? "Desactivando..." : "Desactivar"}
    </button>
  );
}