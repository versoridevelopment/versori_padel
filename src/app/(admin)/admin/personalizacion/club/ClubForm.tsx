"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  Loader2,
  Save,
  UploadCloud,
  Monitor,
  PlayCircle,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Palette,
  Type,
  X,
  Trash2,
  Plus,
} from "lucide-react";
import {
  buildLogoPath,
  buildHeroPath,
  PUBLIC_MEDIA_BUCKET,
} from "@/lib/storage/paths";

type ClubData = {
  nombre: string;
  subdominio: string;
  logo_url: string | null;
  imagen_hero_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_texto: string;
  texto_bienvenida_titulo: string;
  texto_bienvenida_subtitulo: string;
  marcas: { id: string; tipo: "imagen" | "texto"; valor: string }[];
  email: string;
  usuario_instagram: string;
  telefono: string;
  calle: string;
  altura: string;
  barrio: string;
};

interface Props {
  initialData: ClubData;
  clubId: number;
}

export default function ClubForm({ initialData, clubId }: Props) {
  const [formData, setFormData] = useState<ClubData>(initialData);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "identidad" | "estilo" | "contacto" | "marcas"
  >("identidad");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  const isVideo = (url: string) => url?.match(/\.(mp4|webm|mov)$/i);

  const handleChange = (field: keyof ClubData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "hero"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === "logo") {
        setLogoFile(file);
        setFormData((prev) => ({
          ...prev,
          logo_url: URL.createObjectURL(file),
        }));
      } else {
        setHeroFile(file);
        setFormData((prev) => ({
          ...prev,
          imagen_hero_url: URL.createObjectURL(file),
        }));
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setFormData((prev) => ({ ...prev, logo_url: null }));
  };

  // Marcas
  const addMarca = () => {
    const nuevaMarca = {
      id: crypto.randomUUID(),
      tipo: "texto" as const,
      valor: "Nueva Marca",
    };
    setFormData((prev) => ({ ...prev, marcas: [...prev.marcas, nuevaMarca] }));
  };
  const removeMarca = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      marcas: prev.marcas.filter((m) => m.id !== id),
    }));
  };
  const updateMarca = (id: string, valor: string) => {
    setFormData((prev) => ({
      ...prev,
      marcas: prev.marcas.map((m) => (m.id === id ? { ...m, valor } : m)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = formData.logo_url;
      let heroUrl = formData.imagen_hero_url;

      // 1. Subida de Archivos
      if (logoFile) {
        const path = buildLogoPath(clubId, logoFile);
        await supabase.storage
          .from(PUBLIC_MEDIA_BUCKET)
          .upload(path, logoFile, { upsert: true });
        const { data } = supabase.storage
          .from(PUBLIC_MEDIA_BUCKET)
          .getPublicUrl(path);
        logoUrl = data.publicUrl;
      }
      if (heroFile) {
        const path = buildHeroPath(clubId, heroFile);
        await supabase.storage
          .from(PUBLIC_MEDIA_BUCKET)
          .upload(path, heroFile, { upsert: true });
        const { data } = supabase.storage
          .from(PUBLIC_MEDIA_BUCKET)
          .getPublicUrl(path);
        heroUrl = data.publicUrl;
      }

      // 2. Guardar Club (Sin updated_at para evitar error si no existe columna)
      const { error: errClub } = await supabase
        .from("clubes")
        .update({
          nombre: formData.nombre,
          color_primario: formData.color_primario,
          color_secundario: formData.color_secundario,
          color_texto: formData.color_texto,
          texto_bienvenida_titulo: formData.texto_bienvenida_titulo,
          texto_bienvenida_subtitulo: formData.texto_bienvenida_subtitulo,
          logo_url: logoUrl,
          imagen_hero_url: heroUrl,
          marcas: formData.marcas,
        })
        .eq("id_club", clubId);

      if (errClub) throw errClub;

      // 3. Guardar Contacto
      const { data: contactoData, error: errContact } = await supabase
        .from("contacto")
        .upsert(
          {
            id_club: clubId,
            email: formData.email,
            usuario_instagram: formData.usuario_instagram,
          },
          { onConflict: "id_club" }
        )
        .select()
        .single();

      if (errContact) throw errContact;

      // 4. Guardar Dirección y Teléfono
      if (contactoData) {
        await supabase
          .from("direccion")
          .delete()
          .eq("id_contacto", contactoData.id_contacto);
        await supabase.from("direccion").insert({
          id_contacto: contactoData.id_contacto,
          calle: formData.calle,
          altura_calle: formData.altura,
          barrio: formData.barrio,
        });

        await supabase
          .from("telefono")
          .delete()
          .eq("id_contacto", contactoData.id_contacto);
        await supabase.from("telefono").insert({
          id_contacto: contactoData.id_contacto,
          numero: formData.telefono,
          tipo: "Principal",
        });
      }

      alert("¡Cambios guardados correctamente!");
    } catch (error) {
      console.error(error);
      alert("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 -m-6 md:-m-10">
      <div className="max-w-7xl mx-auto space-y-8 pb-32">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              Identidad del Club
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Personaliza nombre, logo, colores y contacto.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="hidden md:flex bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold gap-2 items-center shadow-lg hover:-translate-y-1 disabled:opacity-70"
          >
            {saving ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}{" "}
            Guardar Todo
          </button>
        </div>

        {/* TABS */}
        <div className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          {[
            { id: "identidad", label: "Identidad & Hero", icon: Monitor },
            { id: "estilo", label: "Colores & Textos", icon: Palette },
            { id: "contacto", label: "Contacto & Ubicación", icon: MapPin },
            { id: "marcas", label: "Marcas", icon: Type },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: FORMULARIO */}
          <div className="space-y-6">
            {activeTab === "identidad" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Datos Principales
                  </h2>
                  <div className="mb-4">
                    <label
                      htmlFor="nombre_club"
                      className="block text-sm font-semibold text-slate-700 mb-1"
                    >
                      Nombre del Club
                    </label>
                    <input
                      id="nombre_club"
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleChange("nombre", e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                      placeholder="Ej: Club Padel Pro"
                    />
                  </div>

                  <h2 className="text-lg font-bold text-slate-800 mb-4 mt-6">
                    Logo
                  </h2>
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-28 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                      {formData.logo_url ? (
                        <Image
                          src={formData.logo_url}
                          alt="Logo"
                          width={90}
                          height={90}
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Sin Logo</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="upload_logo"
                        className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 flex gap-2 items-center text-sm"
                      >
                        <UploadCloud className="w-4 h-4" /> Subir Logo
                        <input
                          id="upload_logo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e, "logo")}
                          title="Subir logo"
                        />
                      </label>
                      {formData.logo_url && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 flex gap-2 items-center text-sm"
                        >
                          <Trash2 className="w-4 h-4" /> Quitar Logo
                        </button>
                      )}
                    </div>
                  </div>
                </section>
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-2">
                    Portada (Hero)
                  </h2>
                  <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-300 group">
                    {formData.imagen_hero_url ? (
                      isVideo(formData.imagen_hero_url) ? (
                        <video
                          src={formData.imagen_hero_url}
                          autoPlay
                          loop
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={formData.imagen_hero_url}
                          alt="Hero"
                          fill
                          className="object-cover"
                        />
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 flex-col gap-2">
                        <Monitor className="w-8 h-8" />
                        <span>Sin Portada</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <label
                        htmlFor="upload_hero"
                        className="cursor-pointer bg-white text-slate-900 px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform flex gap-2"
                      >
                        <UploadCloud className="w-5 h-5" /> Cambiar{" "}
                        <input
                          id="upload_hero"
                          type="file"
                          accept="image/*,video/mp4,video/webm"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e, "hero")}
                          title="Subir portada"
                        />
                      </label>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "estilo" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Textos del Home
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="titulo"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Título Principal
                      </label>
                      <input
                        id="titulo"
                        type="text"
                        value={formData.texto_bienvenida_titulo}
                        onChange={(e) =>
                          handleChange(
                            "texto_bienvenida_titulo",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="EL MEJOR LUGAR PARA VIVIR EL PÁDEL"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="subtitulo"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Leyenda (Subtítulo)
                      </label>
                      <input
                        id="subtitulo"
                        type="text"
                        value={formData.texto_bienvenida_subtitulo}
                        onChange={(e) =>
                          handleChange(
                            "texto_bienvenida_subtitulo",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="Reserva tu cancha y únete a la comunidad."
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Si lo dejas vacío, se usará el texto por defecto.
                      </p>
                    </div>
                  </div>
                </section>
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Colores
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label
                        htmlFor="cp"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Color Primario (Botones)
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="cp"
                          type="color"
                          value={formData.color_primario}
                          onChange={(e) =>
                            handleChange("color_primario", e.target.value)
                          }
                          className="h-10 w-16 rounded cursor-pointer border"
                          title="Color primario"
                        />
                        <input
                          type="text"
                          value={formData.color_primario}
                          onChange={(e) =>
                            handleChange("color_primario", e.target.value)
                          }
                          className="flex-1 px-4 border border-slate-300 rounded-xl uppercase"
                          title="Hex primario"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="cs"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Color Secundario (Footer/Fondos)
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="cs"
                          type="color"
                          value={formData.color_secundario}
                          onChange={(e) =>
                            handleChange("color_secundario", e.target.value)
                          }
                          className="h-10 w-16 rounded cursor-pointer border"
                          title="Color secundario"
                        />
                        <input
                          type="text"
                          value={formData.color_secundario}
                          onChange={(e) =>
                            handleChange("color_secundario", e.target.value)
                          }
                          className="flex-1 px-4 border border-slate-300 rounded-xl uppercase"
                          title="Hex secundario"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "contacto" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Datos de Contacto
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleChange("email", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="ig"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Instagram
                      </label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          id="ig"
                          type="text"
                          value={formData.usuario_instagram}
                          onChange={(e) =>
                            handleChange("usuario_instagram", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="tel"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        WhatsApp / Teléfono
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          id="tel"
                          type="text"
                          value={formData.telefono}
                          onChange={(e) =>
                            handleChange("telefono", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </section>
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Ubicación
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label
                        htmlFor="calle"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Calle
                      </label>
                      <input
                        id="calle"
                        type="text"
                        value={formData.calle}
                        onChange={(e) => handleChange("calle", e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="altura"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Altura
                      </label>
                      <input
                        id="altura"
                        type="text"
                        value={formData.altura}
                        onChange={(e) => handleChange("altura", e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="barrio"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Barrio
                      </label>
                      <input
                        id="barrio"
                        type="text"
                        value={formData.barrio}
                        onChange={(e) => handleChange("barrio", e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "marcas" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Marcas</h2>
                    <button
                      type="button"
                      onClick={addMarca}
                      className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.marcas.map((marca, i) => (
                      <div
                        key={marca.id}
                        className="flex items-center gap-2 p-3 border border-slate-100 rounded-xl bg-slate-50"
                      >
                        <Type className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={marca.valor}
                          onChange={(e) =>
                            updateMarca(marca.id, e.target.value)
                          }
                          className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-700"
                          title={`Marca ${i + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeMarca(marca.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: PREVIEW (Ahora oculta en móvil) */}
          <div className="sticky top-6 hidden lg:block">
            <div className="bg-[#0b0d12] rounded-[2rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden h-[800px] relative flex flex-col">
              <div className="bg-slate-800 py-2 text-center text-xs text-slate-400">
                Vista Previa: {activeTab === "contacto" ? "Footer" : "Home"}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
                {/* HERO PREVIEW */}
                <div className="relative h-[400px] shrink-0 flex items-center justify-center">
                  {formData.imagen_hero_url ? (
                    isVideo(formData.imagen_hero_url) ? (
                      <video
                        src={formData.imagen_hero_url}
                        autoPlay
                        loop
                        muted
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                    ) : (
                      <Image
                        src={formData.imagen_hero_url}
                        alt="Hero"
                        fill
                        className="object-cover opacity-60"
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 bg-blue-900/20" />
                  )}
                  <div className="relative z-10 text-center px-6 mt-10">
                    {formData.logo_url ? (
                      <Image
                        src={formData.logo_url}
                        alt="Logo"
                        width={100}
                        height={100}
                        className="mx-auto mb-4 object-contain drop-shadow-xl"
                      />
                    ) : (
                      <h1 className="text-3xl font-bold text-white mb-2">
                        {formData.nombre.toUpperCase()}
                      </h1>
                    )}
                    <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                      {formData.texto_bienvenida_titulo}
                    </h2>
                    <p className="text-gray-300 text-sm mb-4">
                      {formData.texto_bienvenida_subtitulo ||
                        "El mejor lugar para vivir el pádel."}
                    </p>
                    <button
                      className="px-6 py-2 rounded-lg text-white font-bold text-xs"
                      style={{ backgroundColor: formData.color_primario }}
                    >
                      RESERVAR CANCHA
                    </button>
                  </div>
                </div>
                {/* FOOTER PREVIEW */}
                <div
                  className="p-8 mt-auto"
                  style={{
                    backgroundColor: formData.color_secundario || "#0b0d12",
                  }}
                >
                  <div className="space-y-4">
                    <h3 className="text-white font-bold border-b border-white/10 pb-2">
                      Contacto
                    </h3>
                    {formData.calle && (
                      <div className="flex items-center gap-3 text-gray-400 text-sm">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        {formData.calle} {formData.altura}, {formData.barrio}
                      </div>
                    )}
                    {formData.telefono && (
                      <div className="flex items-center gap-3 text-gray-400 text-sm">
                        <Phone className="w-4 h-4 text-blue-500" />
                        {formData.telefono}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
