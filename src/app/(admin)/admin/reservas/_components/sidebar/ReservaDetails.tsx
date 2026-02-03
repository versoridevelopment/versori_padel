"use client";

import {
  User,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  UserCog,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  Wallet,
  CalendarRange,
  DollarSign,
} from "lucide-react";
import { formatMoney } from "../hooks/useReservaSidebar";
import type { ReservaUI } from "../types";

export default function ReservaDetails({
  reserva,
  getWhatsappLink,
}: {
  reserva: ReservaUI | null;
  getWhatsappLink: (p: string) => string;
}) {
  // Si no hay reserva (modo creación), no renderizamos detalles
  if (!reserva) return null;

  const email = reserva.cliente_email || "";
  const origen = reserva.origen || "web";
  const telefono = reserva.cliente_telefono || "";
  const tieneTelefono = telefono && telefono !== "Sin teléfono";

  const saldo = Number(reserva.saldo_pendiente || 0);
  const total = Number(reserva.precio_total || 0);

  const estadoPago = saldo > 0 ? "pendiente" : "pagado";

  // Lógica de origen corregida: admin y turno_fijo son Gestión Admin
  const isGestionAdmin = origen === "admin" || origen === "turno_fijo";

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header: Perfil Jugador */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group">
        <div className="p-4">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 font-bold text-xl uppercase">
              {reserva.cliente_nombre?.charAt(0) || (
                <User className="w-6 h-6" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <h3 className="text-lg font-bold text-slate-800 leading-tight truncate">
                {reserva.cliente_nombre || "Cliente Anónimo"}
              </h3>

              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{telefono || "Sin teléfono"}</span>
                </div>
                {email && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[200px]" title={email}>
                      {email}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {tieneTelefono && (
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-end">
            <a
              href={getWhatsappLink(telefono)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* 2. Metadatos del Turno */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Origen
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isGestionAdmin ? (
              <div className="flex items-center gap-1.5 text-amber-700 font-bold px-2 py-0.5 rounded text-xs">
                <UserCog className="w-3.5 h-3.5" /> Gestión Admin
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">
                <Globe className="w-3.5 h-3.5" /> Reserva Web
              </div>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Tipo de Turno
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 font-bold px-2 py-0.5 rounded text-xs">
            <CalendarRange className="w-3.5 h-3.5" />{" "}
            {reserva.tipo_turno || "Normal"}
          </div>
        </div>
      </div>

      {/* 3. Sección Económica */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-400" />
            Control de Pago
          </h4>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${estadoPago === "pendiente" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}
          >
            {estadoPago}
          </span>
        </div>

        <div className="p-4 bg-white space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-300" /> Precio Total
            </span>
            <span className="font-bold text-slate-800">
              {formatMoney(total)}
            </span>
          </div>

          <div className="h-px bg-slate-100 my-1" />

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-400" /> Saldo a Cobrar
            </span>
            <span
              className={`text-lg font-black ${saldo > 0 ? "text-rose-600" : "text-slate-400"}`}
            >
              {formatMoney(saldo)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
