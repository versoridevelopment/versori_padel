"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
  X,
  Plus,
  ImageIcon,
  BookOpen,
  FileText,
  Trash2,
  Heart,
  Users,
  LayoutTemplate, // Icono para el tab Home
} from "lucide-react";

interface Valor {
  titulo: string;
  contenido: string;
}

interface Props {
  clubId: number;
  initialData: any;
}

export default function NosotrosPageForm({ clubId, initialData }: Props) {
  const [saving, setSaving] = useState(false);

  // Agregamos el tab 'home'
  const [activeTab, setActiveTab] = useState<
    "home" | "general" | "galeria" | "valores" | "equipo"
  >("home");

  // --- ESTADOS PARA ARCHIVOS ---

  // 1. Galería Interna
  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
  const [newGalleryPreviews, setNewGalleryPreviews] = useState<string[]>([]);

  // 2. Slider Home (NUEVO)
  const [newHomeSliderFiles, setNewHomeSliderFiles] = useState<File[]>([]);
  const [newHomeSliderPreviews, setNewHomeSliderPreviews] = useState<string[]>(
    []
  );

  // 3. Imagen Equipo
  const [teamImageFile, setTeamImageFile] = useState<File | null>(null);
  const [teamImagePreview, setTeamImagePreview] = useState<string | null>(null);

  // --- ESTADO PRINCIPAL ---
  const [data, setData] = useState({
    activo_nosotros: initialData?.activo_nosotros ?? true,

    // DATOS HOME (Movidos aquí)
    home_titulo: initialData?.home_titulo || "",
    home_descripcion: initialData?.home_descripcion || "",
    galeria_inicio: (initialData?.galeria_inicio as string[]) || [],

    // DATOS PÁGINA INTERNA
    historia_titulo: initialData?.historia_titulo || "Nuestra Historia",
    hero_descripcion: initialData?.hero_descripcion || "",
    historia_contenido: initialData?.historia_contenido || "",
    frase_cierre: initialData?.frase_cierre || "",
    galeria_pagina: (initialData?.galeria_pagina as string[]) || [],
    valores: (initialData?.valores as Valor[]) || [],
    equipo_imagen_url: initialData?.equipo_imagen_url || null,
    recruitment_phone: initialData?.recruitment_phone || "",
    recruitment_message: initialData?.recruitment_message || "",
  });

  // --- HANDLERS GALERÍA INTERNA ---
  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setNewGalleryFiles((prev) => [...prev, ...filesArr]);
      const newUrls = filesArr.map((f) => URL.createObjectURL(f));
      setNewGalleryPreviews((prev) => [...prev, ...newUrls]);
    }
  };
  const removeExistingImage = (index: number) => {
    setData((prev) => ({
      ...prev,
      galeria_pagina: prev.galeria_pagina.filter((_, i) => i !== index),
    }));
  };
  const removeNewImage = (index: number) => {
    setNewGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setNewGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // --- HANDLERS SLIDER HOME (NUEVO) ---
  const handleHomeSliderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setNewHomeSliderFiles((prev) => [...prev, ...filesArr]);
      const newUrls = filesArr.map((f) => URL.createObjectURL(f));
      setNewHomeSliderPreviews((prev) => [...prev, ...newUrls]);
    }
  };
  const removeExistingHomeSlider = (index: number) => {
    setData((prev) => ({
      ...prev,
      galeria_inicio: prev.galeria_inicio.filter((_, i) => i !== index),
    }));
  };
  const removeNewHomeSlider = (index: number) => {
    setNewHomeSliderFiles((prev) => prev.filter((_, i) => i !== index));
    setNewHomeSliderPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // --- HANDLERS EQUIPO ---
  const handleTeamImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTeamImageFile(file);
      setTeamImagePreview(URL.createObjectURL(file));
    }
  };

  // --- HANDLERS VALORES ---
  const addValor = () => {
    setData((prev) => ({
      ...prev,
      valores: [
        ...prev.valores,
        { titulo: "Nuevo Valor", contenido: "Descripción corta..." },
      ],
    }));
  };
  const updateValor = (index: number, field: keyof Valor, value: string) => {
    const updatedValores = [...data.valores];
    updatedValores[index] = { ...updatedValores[index], [field]: value };
    setData((prev) => ({ ...prev, valores: updatedValores }));
  };
  const removeValor = (index: number) => {
    setData((prev) => ({
      ...prev,
      valores: prev.valores.filter((_, i) => i !== index),
    }));
  };

  // --- GUARDAR ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clubId", clubId.toString());

      // Enviamos todos los textos y URLs viejas en el JSON 'settings'
      formData.append("settings", JSON.stringify(data));

      // 1. Archivos Galería Interna (COINCIDE con backend: galleryFiles)
      newGalleryFiles.forEach((f) => formData.append("galleryFiles", f));

      // 2. Archivos Slider Home (COINCIDE con backend: homeSliderFiles)
      // ¡OJO! Tu estado se llama 'newHomeSliderFiles' en el código que te di antes.
      // Si usas el código que pegaste arriba, asegúrate de tener el estado creado.
      // Si no tienes el estado creado para el home slider en el código que pegaste recién,
      // agrégalo como hicimos en el paso anterior:

      // (Si usaste mi código anterior completo, esta variable existe)
      newHomeSliderFiles.forEach((f) => formData.append("homeSliderFiles", f));

      // 3. Archivo Equipo (COINCIDE con backend: teamImageFile)
      if (teamImageFile) {
        formData.append("teamImageFile", teamImageFile);
      }

      // Asegúrate que la ruta sea esta
      const res = await fetch("/api/admin/nosotros/update", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al guardar");

      alert("Página actualizada correctamente");
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER & VISIBILIDAD */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Configuración
            &quot;Nosotros&quot;
          </h2>
          <p className="text-sm text-slate-500">
            Administra el contenido institucional y su visualización en Home.
          </p>
        </div>
        <button
          onClick={() =>
            setData((prev) => ({
              ...prev,
              activo_nosotros: !prev.activo_nosotros,
            }))
          }
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
            data.activo_nosotros
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {data.activo_nosotros ? (
            <ToggleRight className="w-6 h-6" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
          {data.activo_nosotros ? "Sección Activa" : "Sección Inactiva"}
        </button>
      </section>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {[
          { id: "home", label: "En Home", icon: LayoutTemplate },
          { id: "general", label: "Página Interna", icon: FileText },
          { id: "galeria", label: "Galería Interna", icon: ImageIcon },
          { id: "valores", label: "Valores", icon: Heart },
          { id: "equipo", label: "Equipo", icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {data.activo_nosotros && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
          {/* --- TAB HOME (NUEVO) --- */}
          {activeTab === "home" && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Título en Home (Corto)
                  </label>
                  <input
                    type="text"
                    value={data.home_titulo}
                    onChange={(e) =>
                      setData({ ...data, home_titulo: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                    placeholder="Ej: El Club"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Resumen en Home (Bajada)
                  </label>
                  <textarea
                    rows={3}
                    value={data.home_descripcion}
                    onChange={(e) =>
                      setData({ ...data, home_descripcion: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl resize-none"
                    placeholder="Breve descripción para la portada..."
                  />
                </div>
              </div>

              {/* SLIDER DEL HOME */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      Slider del Home
                    </h3>
                    <p className="text-xs text-slate-500">
                      Imágenes que aparecen junto al resumen en la portada.
                    </p>
                  </div>
                  <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100 flex gap-2 items-center">
                    <Plus className="w-4 h-4" /> Agregar
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleHomeSliderSelect}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {/* Existentes Home */}
                  {data.galeria_inicio.map((url, i) => (
                    <div
                      key={`home-saved-${i}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                    >
                      <Image
                        src={url}
                        alt="Saved"
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => removeExistingHomeSlider(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Nuevas Home */}
                  {newHomeSliderPreviews.map((url, i) => (
                    <div
                      key={`home-new-${i}`}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-green-400 group"
                    >
                      <Image
                        src={url}
                        alt="New"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] px-2 py-0.5 font-bold">
                        NUEVA
                      </div>
                      <button
                        onClick={() => removeNewHomeSlider(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {data.galeria_inicio.length === 0 &&
                    newHomeSliderPreviews.length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-400 text-sm border-2 border-dashed rounded-xl bg-slate-50">
                        Sin imágenes para el home.
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB GENERAL (Página Interna) --- */}
          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Título Página Interna
                  </label>
                  <input
                    type="text"
                    value={data.historia_titulo}
                    onChange={(e) =>
                      setData({ ...data, historia_titulo: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Bajada / Introducción
                  </label>
                  <input
                    type="text"
                    value={data.hero_descripcion}
                    onChange={(e) =>
                      setData({ ...data, hero_descripcion: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Historia Completa (Contenido Rico)
                </label>
                <textarea
                  rows={10}
                  value={data.historia_contenido}
                  onChange={(e) =>
                    setData({ ...data, historia_contenido: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl resize-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Frase de Cierre
                </label>
                <input
                  type="text"
                  value={data.frase_cierre}
                  onChange={(e) =>
                    setData({ ...data, frase_cierre: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl italic"
                />
              </div>
            </div>
          )}

          {/* --- TAB GALERÍA (Página Interna) --- */}
          {activeTab === "galeria" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">
                  Galería Página Interna
                </h3>
                <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100 flex gap-2 items-center">
                  <Plus className="w-4 h-4" /> Agregar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGallerySelect}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.galeria_pagina.map((url, i) => (
                  <div
                    key={`saved-${i}`}
                    className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                  >
                    <Image
                      src={url}
                      alt="Saved"
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => removeExistingImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {newGalleryPreviews.map((url, i) => (
                  <div
                    key={`new-${i}`}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-green-400 group"
                  >
                    <Image src={url} alt="New" fill className="object-cover" />
                    <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] px-2 py-0.5 font-bold">
                      NUEVA
                    </div>
                    <button
                      onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {data.galeria_pagina.length === 0 &&
                  newGalleryPreviews.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400 text-sm border-2 border-dashed rounded-xl bg-slate-50">
                      Sin imágenes en la galería interna.
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* --- TAB VALORES --- */}
          {activeTab === "valores" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Nuestros Valores</h3>
                <button
                  onClick={addValor}
                  className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100 flex gap-2 items-center"
                >
                  <Plus className="w-4 h-4" /> Nuevo Valor
                </button>
              </div>
              <div className="grid gap-4">
                {data.valores.map((valor, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 items-start"
                  >
                    <div className="mt-2 bg-white p-2 rounded-lg border border-slate-200 text-slate-400">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={valor.titulo}
                        onChange={(e) =>
                          updateValor(i, "titulo", e.target.value)
                        }
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-sm"
                        placeholder="Título (Ej: Pasión)"
                      />
                      <textarea
                        rows={2}
                        value={valor.contenido}
                        onChange={(e) =>
                          updateValor(i, "contenido", e.target.value)
                        }
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm resize-none"
                        placeholder="Descripción..."
                      />
                    </div>
                    <button
                      onClick={() => removeValor(i)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {data.valores.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">
                    No has agregado valores aún.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* --- TAB EQUIPO --- */}
          {activeTab === "equipo" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-slate-800 mb-4">
                    Fondo de la Sección
                  </h3>
                  <div className="relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 flex flex-col items-center justify-center group hover:border-blue-400 transition-colors">
                    {teamImagePreview || data.equipo_imagen_url ? (
                      <Image
                        src={teamImagePreview || data.equipo_imagen_url || ""}
                        alt="Team BG"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-xs">Sin imagen</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform">
                        Cambiar Imagen
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleTeamImageSelect}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTÓN GUARDAR */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 shadow-lg hover:-translate-y-1 transition-all"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
