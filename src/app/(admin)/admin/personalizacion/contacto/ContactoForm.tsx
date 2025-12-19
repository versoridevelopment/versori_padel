"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  Loader2,
  Save,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
} from "lucide-react";

// Tipos aproximados basados en tu DB
type ContactoData = {
  id_contacto?: number;
  email?: string;
  instagram_url?: string;
  usuario_instagram?: string; // Agregado en tu script anterior
  direccion?: {
    calle?: string;
    altura_calle?: string;
    barrio?: string;
    latitud?: number;
    longitud?: number;
  }[];
  telefono?: {
    numero?: string;
    tipo?: string;
  }[];
};

interface Props {
  initialData: ContactoData | null;
  clubId: number;
  subdominio: string;
}

export default function ContactoForm({
  initialData,
  clubId,
  subdominio,
}: Props) {
  const [saving, setSaving] = useState(false);

  // Estado aplanado para facilitar el formulario
  const [email, setEmail] = useState(initialData?.email || "");
  const [instagramUser, setInstagramUser] = useState(
    initialData?.usuario_instagram || ""
  );
  const [instagramUrl, setInstagramUrl] = useState(
    initialData?.instagram_url || ""
  );

  // Asumimos 1 dirección y 1 teléfono principal por ahora para simplificar el MVP
  const dir = initialData?.direccion?.[0];
  const tel = initialData?.telefono?.[0];

  const [calle, setCalle] = useState(dir?.calle || "");
  const [altura, setAltura] = useState(dir?.altura_calle || "");
  const [barrio, setBarrio] = useState(dir?.barrio || "");
  const [telefonoNum, setTelefonoNum] = useState(tel?.numero || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Guardar/Actualizar tabla padre 'contacto'
      const { data: contacto, error: errContacto } = await supabase
        .from("contacto")
        .upsert(
          {
            id_club: clubId,
            email: email,
            usuario_instagram: instagramUser,
            instagram_url: instagramUrl,
          },
          { onConflict: "id_club" }
        )
        .select()
        .single();

      if (errContacto) throw errContacto;

      if (contacto) {
        const idContacto = contacto.id_contacto;

        // 2. Guardar Dirección (Upsert básico asumiendo 1 por contacto por ahora)
        // Nota: Idealmente usarías un ID específico si existe, aquí hacemos un delete/insert o update
        // Para simplificar MVP: Borramos anteriores e insertamos la nueva (estrategia simple)
        await supabase.from("direccion").delete().eq("id_contacto", idContacto);
        await supabase.from("direccion").insert({
          id_contacto: idContacto,
          calle,
          altura_calle: altura,
          barrio,
        });

        // 3. Guardar Teléfono
        await supabase.from("telefono").delete().eq("id_contacto", idContacto);
        await supabase.from("telefono").insert({
          id_contacto: idContacto,
          numero: telefonoNum,
          tipo: "Principal",
        });
      }

      alert("Contacto actualizado correctamente");
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 -m-6 md:-m-10">
      <div className="max-w-[1600px] mx-auto space-y-8 pb-32">
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Contacto y Ubicación
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Define cómo te encuentran tus clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* EDITOR */}
          <div className="space-y-6">
            {/* Redes y Contacto */}
            <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Datos de Contacto
                </h2>
              </div>
              <div className="grid gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Público
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                    placeholder="contacto@club.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Usuario Instagram
                  </label>
                  <div className="flex">
                    <span className="bg-slate-100 border border-r-0 border-slate-300 px-4 py-3 rounded-l-xl text-slate-500">
                      @
                    </span>
                    <input
                      type="text"
                      value={instagramUser}
                      onChange={(e) => setInstagramUser(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-r-xl outline-none focus:border-blue-500"
                      placeholder="versori.padel"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={telefonoNum}
                    onChange={(e) => setTelefonoNum(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                    placeholder="+54 9 379 4..."
                  />
                </div>
              </div>
            </section>

            {/* Ubicación */}
            <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-red-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Ubicación Física
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Calle
                  </label>
                  <input
                    type="text"
                    value={calle}
                    onChange={(e) => setCalle(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-red-500"
                    placeholder="Av. Costanera"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Altura / Número
                  </label>
                  <input
                    type="text"
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-red-500"
                    placeholder="1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Barrio
                  </label>
                  <input
                    type="text"
                    value={barrio}
                    onChange={(e) => setBarrio(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-red-500"
                    placeholder="Centro"
                  />
                </div>
              </div>
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500">
                ℹ️ Próximamente podrás seleccionar la ubicación exacta en el
                mapa.
              </div>
            </section>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white text-lg font-bold px-10 py-4 rounded-xl shadow-lg transition-all flex items-center gap-3 disabled:opacity-70"
              >
                {saving ? (
                  <Loader2 className="animate-spin w-6 h-6" />
                ) : (
                  <Save className="w-6 h-6" />
                )}
                Guardar Datos
              </button>
            </div>
          </div>

          {/* PREVIEW (Footer simulado) */}
          <div className="xl:col-span-1 xl:sticky xl:top-6">
            <div className="bg-[#0b0d12] rounded-[2rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden h-[600px] flex flex-col relative">
              <div className="bg-slate-800 px-5 py-4 flex justify-center relative shrink-0">
                <div className="bg-slate-700 text-slate-300 text-xs font-medium px-4 py-1.5 rounded-full">
                  🔒 {subdominio}.versori.com (Footer)
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center bg-[#0d1522] p-8 text-center">
                <div className="space-y-8 w-full max-w-md">
                  <h3 className="text-white text-2xl font-bold mb-6">
                    Contactanos
                  </h3>

                  <div className="flex flex-col gap-6 text-gray-300">
                    {telefonoNum && (
                      <div className="flex items-center justify-center gap-3">
                        <Phone className="text-blue-400 w-5 h-5" />
                        <span className="text-lg">{telefonoNum}</span>
                      </div>
                    )}
                    {email && (
                      <div className="flex items-center justify-center gap-3">
                        <Mail className="text-blue-400 w-5 h-5" />
                        <span className="text-lg">{email}</span>
                      </div>
                    )}
                    {(instagramUser || instagramUrl) && (
                      <div className="flex items-center justify-center gap-3">
                        <Instagram className="text-pink-400 w-5 h-5" />
                        <span className="text-lg">
                          @{instagramUser || "usuario"}
                        </span>
                      </div>
                    )}
                    {(calle || barrio) && (
                      <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-800">
                        <MapPin className="text-red-400 w-5 h-5" />
                        <div>
                          <p className="font-semibold text-white">
                            {calle} {altura}
                          </p>
                          <p className="text-sm text-gray-500">{barrio}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-slate-500 mt-4 font-medium">
              Vista previa del pie de página
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
