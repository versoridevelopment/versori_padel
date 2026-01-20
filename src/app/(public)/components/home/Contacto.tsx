"use client";

import { MapPin, Phone, Mail } from "lucide-react";
import Container from "../ui/Container";

interface Props {
  data: any;
  colors: { primary: string };
}

export default function Contacto({ data, colors }: Props) {
  if (!data) return null;

  const telefono = data.telefonos?.[0]?.numero || data.telefono_principal;

  // FIX: Manejo seguro de la dirección para evitar "undefined"
  const dirObj = data.direcciones?.[0];
  const calle = dirObj?.calle || "";
  const altura = dirObj?.altura ? ` ${dirObj.altura}` : ""; // Espacio solo si hay altura
  const barrio = dirObj?.barrio ? `, ${dirObj.barrio}` : ""; // Coma solo si hay barrio

  const direccionCompleta =
    calle || altura || barrio
      ? `${calle}${altura}${barrio}`
      : "Dirección no disponible";

  return (
    <section className="py-20 bg-[#0b0d12] border-t border-white/5">
      <Container>
        <div className="bg-[#15171e] rounded-3xl p-8 md:p-12 border border-white/5 flex flex-col lg:flex-row justify-between items-center gap-12 shadow-2xl">
          <div className="w-full lg:w-1/2 space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              ¿Listo para jugar?
            </h2>
            <div className="space-y-6">
              {/* Dirección */}
              <div className="flex items-start gap-4 text-gray-300 group">
                <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                  <MapPin
                    className="w-6 h-6"
                    style={{ color: colors.primary }}
                  />
                </div>
                <div className="mt-1">
                  <p className="font-medium text-white">Ubicación</p>
                  <span className="text-sm text-gray-400">
                    {direccionCompleta}
                  </span>
                </div>
              </div>

              {/* Teléfono */}
              <div className="flex items-start gap-4 text-gray-300 group">
                <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                  <Phone
                    className="w-6 h-6"
                    style={{ color: colors.primary }}
                  />
                </div>
                <div className="mt-1">
                  <p className="font-medium text-white">Reservas y Consultas</p>
                  <span className="text-sm text-gray-400">
                    {telefono || "Sin teléfono"}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 text-gray-300 group">
                <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                  <Mail className="w-6 h-6" style={{ color: colors.primary }} />
                </div>
                <div className="mt-1">
                  <p className="font-medium text-white">Email</p>
                  <span className="text-sm text-gray-400">
                    {data.email || "Sin email"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
