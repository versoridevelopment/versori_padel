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
  LayoutTemplate,
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
  const [activeTab, setActiveTab] = useState<
    "home" | "general" | "galeria" | "valores" | "equipo"
  >("home");

  // --- ESTADOS ---
  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
  const [newGalleryPreviews, setNewGalleryPreviews] = useState<string[]>([]);
  const [newHomeSliderFiles, setNewHomeSliderFiles] = useState<File[]>([]);
  const [newHomeSliderPreviews, setNewHomeSliderPreviews] = useState<string[]>(
    []
  );
  const [teamImageFile, setTeamImageFile] = useState<File | null>(null);
  const [teamImagePreview, setTeamImagePreview] = useState<string | null>(null);

  const [data, setData] = useState({
    activo_nosotros: initialData?.activo_nosotros ?? true,
    home_titulo: initialData?.home_titulo || "",
    home_descripcion: initialData?.home_descripcion || "",
    galeria_inicio: (initialData?.galeria_inicio as string[]) || [],
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

  // --- HANDLERS (Lógica idéntica) ---
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
  const handleTeamImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTeamImageFile(file);
      setTeamImagePreview(URL.createObjectURL(file));
    }
  };
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clubId", clubId.toString());
      formData.append("settings", JSON.stringify(data));
      newGalleryFiles.forEach((f) => formData.append("galleryFiles", f));
      newHomeSliderFiles.forEach((f) => formData.append("homeSliderFiles", f));
      if (teamImageFile) formData.append("teamImageFile", teamImageFile);

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
    // ESTRUCTURA COPIADA EXACTAMENTE DE CLUBFORM (Márgenes negativos para compensar padding del layout)
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 -m-6 md:-m-10">
      {/* BOTÓN FLOTANTE MÓVIL (Igual que ClubForm) */}
      <div className="md:hidden fixed bottom-6 right-6 z-[9999]">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 active:scale-95 transition-all hover:bg-green-700"
          title="Guardar cambios"
        >
          {saving ? (
            <Loader2 className="animate-spin w-6 h-6" />
          ) : (
            <Save className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 pb-32">
        {/* HEADER (Igual que ClubForm) */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              Personalización "Nosotros"
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Gestiona la historia, valores y equipo.
            </p>
          </div>
          {/* Botón Desktop */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="hidden md:flex bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold gap-2 items-center shadow-lg hover:-translate-y-1 disabled:opacity-70"
          >
            {saving ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Guardar Todo
          </button>
        </div>

        {/* TABS (Estructura idéntica a ClubForm) */}
        <div className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          {[
            { id: "home", label: "En Home", icon: LayoutTemplate },
            { id: "general", label: "Página Interna", icon: FileText },
            { id: "galeria", label: "Galería Interna", icon: ImageIcon },
            { id: "valores", label: "Valores", icon: Heart },
            { id: "equipo", label: "Equipo", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
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

        {/* CONTENIDO (Layout adaptable) */}
        <div className="grid grid-cols-1 gap-8 items-start">
          <div className="space-y-6">
            {/* --- ACTIVAR/DESACTIVAR --- */}
            <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">
                  Visibilidad de la Sección
                </h3>
                <p className="text-xs text-slate-500">
                  Activa o desactiva toda la sección en la web.
                </p>
              </div>
              <button
                type="button"
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
                {data.activo_nosotros ? "Visible" : "Oculto"}
              </button>
            </section>

            {data.activo_nosotros && (
              <>
                {/* --- TAB HOME --- */}
                {activeTab === "home" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h2 className="text-lg font-bold text-slate-800 mb-4">
                        Configuración Home
                      </h2>
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Título (Corto)
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
                            Resumen (Bajada)
                          </label>
                          <textarea
                            rows={3}
                            value={data.home_descripcion}
                            onChange={(e) =>
                              setData({
                                ...data,
                                home_descripcion: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-slate-300 rounded-xl resize-none"
                            placeholder="Breve descripción..."
                          />
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-800 mb-2">
                        Slider del Home
                      </h3>
                      <div className="flex items-center gap-4 mb-4">
                        <p className="text-xs text-slate-500 flex-1">
                          Imágenes para la portada.
                        </p>
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                              type="button"
                              onClick={() => removeExistingHomeSlider(i)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
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
                            <div className="absolute top-0 left-0 bg-green-500 text-white text-[9px] px-2 py-0.5 font-bold">
                              NUEVA
                            </div>
                            <button
                              type="button"
                              onClick={() => removeNewHomeSlider(i)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {/* --- TAB GENERAL --- */}
                {activeTab === "general" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h2 className="text-lg font-bold text-slate-800 mb-4">
                        Página Interna
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Título Principal
                          </label>
                          <input
                            type="text"
                            value={data.historia_titulo}
                            onChange={(e) =>
                              setData({
                                ...data,
                                historia_titulo: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Introducción
                          </label>
                          <input
                            type="text"
                            value={data.hero_descripcion}
                            onChange={(e) =>
                              setData({
                                ...data,
                                hero_descripcion: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Historia Completa
                          </label>
                          <textarea
                            rows={8}
                            value={data.historia_contenido}
                            onChange={(e) =>
                              setData({
                                ...data,
                                historia_contenido: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-slate-300 rounded-xl resize-none"
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
                    </section>
                  </div>
                )}

                {/* --- TAB GALERÍA --- */}
                {activeTab === "galeria" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-800">
                          Galería Interna
                        </h2>
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                              type="button"
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
                              type="button"
                              onClick={() => removeNewImage(i)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {/* --- TAB VALORES --- */}
                {activeTab === "valores" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-800">
                          Nuestros Valores
                        </h2>
                        <button
                          type="button"
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
                            <div className="mt-2 bg-white p-2 rounded-lg border border-slate-200 text-slate-400 shrink-0">
                              <Heart className="w-5 h-5" />
                            </div>
                            <div className="flex-1 space-y-2 min-w-0">
                              <input
                                type="text"
                                value={valor.titulo}
                                onChange={(e) =>
                                  updateValor(i, "titulo", e.target.value)
                                }
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-sm"
                                placeholder="Título"
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
                              type="button"
                              onClick={() => removeValor(i)}
                              className="text-slate-400 hover:text-red-500 p-1 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {/* --- TAB EQUIPO --- */}
                {activeTab === "equipo" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h2 className="text-lg font-bold text-slate-800 mb-4">
                        Fondo Sección Equipo
                      </h2>
                      <div className="relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 flex flex-col items-center justify-center group hover:border-blue-400 transition-colors">
                        {teamImagePreview || data.equipo_imagen_url ? (
                          <Image
                            src={
                              teamImagePreview || data.equipo_imagen_url || ""
                            }
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
                            Cambiar Imagen{" "}
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleTeamImageSelect}
                            />
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
