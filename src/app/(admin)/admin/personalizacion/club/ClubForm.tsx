"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Loader2,
  Save,
  UploadCloud,
  Monitor,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Palette,
  Type,
  Trash2,
  Plus,
  ImageIcon,
  AlignLeft,
  BookOpen,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// --- TIPOS ---
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

type Valor = { titulo: string; contenido: string };

type NosotrosData = {
  activo_nosotros: boolean;
  historia_titulo: string;
  hero_descripcion: string;
  historia_contenido: string;
  frase_cierre: string;
  historia_imagen_url: string | null;
  galeria_inicio: string[];
  valores: Valor[];
};

interface Props {
  initialData: ClubData;
  nosotrosInitialData: NosotrosData | null;
  clubId: number;
}

export default function ClubForm({
  initialData,
  nosotrosInitialData,
  clubId,
}: Props) {
  // --- ESTADO GENERAL ---
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "identidad" | "nosotros" | "estilo" | "contacto" | "marcas"
  >("identidad");

  // --- ESTADO CLUB ---
  const [formData, setFormData] = useState<ClubData>(initialData);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [brandFiles, setBrandFiles] = useState<Record<string, File>>({});

  // --- ESTADO NOSOTROS (HOME PREVIEW) ---
  const [nosotrosData, setNosotrosData] = useState<NosotrosData>(
    nosotrosInitialData || {
      activo_nosotros: true,
      historia_titulo: "",
      hero_descripcion: "",
      historia_contenido: "",
      frase_cierre: "",
      historia_imagen_url: null,
      galeria_inicio: [],
      valores: [],
    }
  );

  // Estado para nuevas imágenes de galería del home
  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
  const [newGalleryPreviews, setNewGalleryPreviews] = useState<string[]>([]);

  // Helpers
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|mov)$/i);

  // === EFECTO FAVICON ===
  useEffect(() => {
    const changeFavicon = (src: string) => {
      const link = document.createElement("link");
      const oldLinks = document.querySelectorAll(
        'link[rel="icon"], link[rel="shortcut icon"]'
      );
      oldLinks.forEach((e) => e.parentNode?.removeChild(e));
      link.id = "dynamic-favicon";
      link.rel = "icon";
      link.href = src;
      document.head.appendChild(link);
    };

    if (formData.logo_url) {
      const isRemote = formData.logo_url.startsWith("http");
      const faviconUrl = isRemote
        ? `${formData.logo_url}?t=${new Date().getTime()}`
        : formData.logo_url;
      changeFavicon(faviconUrl);
    } else {
      changeFavicon("/icon.png");
    }
  }, [formData.logo_url]);

  // === HANDLERS CLUB ===
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

  // Marcas Handlers
  const addMarca = () =>
    setFormData((prev) => ({
      ...prev,
      marcas: [
        ...prev.marcas,
        { id: crypto.randomUUID(), tipo: "texto", valor: "Nueva Marca" },
      ],
    }));

  const removeMarca = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      marcas: prev.marcas.filter((m) => m.id !== id),
    }));
    const newFiles = { ...brandFiles };
    delete newFiles[id];
    setBrandFiles(newFiles);
  };

  const updateMarcaValor = (id: string, valor: string) =>
    setFormData((prev) => ({
      ...prev,
      marcas: prev.marcas.map((m) => (m.id === id ? { ...m, valor } : m)),
    }));

  const toggleMarcaTipo = (id: string) =>
    setFormData((prev) => ({
      ...prev,
      marcas: prev.marcas.map((m) =>
        m.id === id
          ? {
              ...m,
              tipo: m.tipo === "texto" ? "imagen" : "texto",
              valor: m.tipo === "texto" ? "" : "Nueva Marca",
            }
          : m
      ),
    }));

  const handleBrandFileChange = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandFiles((prev) => ({ ...prev, [id]: file }));
      updateMarcaValor(id, URL.createObjectURL(file));
    }
  };

  // === HANDLERS NOSOTROS (HOME) ===
  const handleNosotrosChange = (field: keyof NosotrosData, value: any) => {
    setNosotrosData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setNewGalleryFiles((prev) => [...prev, ...files]);
      setNewGalleryPreviews((prev) => [
        ...prev,
        ...files.map((f) => URL.createObjectURL(f)),
      ]);
    }
  };

  const removeGalleryImage = (index: number, isNew: boolean) => {
    if (isNew) {
      setNewGalleryFiles((prev) => prev.filter((_, i) => i !== index));
      setNewGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      setNosotrosData((prev) => ({
        ...prev,
        galeria_inicio: prev.galeria_inicio.filter((_, i) => i !== index),
      }));
    }
  };

  // === SAVE ===
  const handleSave = async () => {
    setSaving(true);
    try {
      const formDataToSend = new FormData();

      // 1. Datos Básicos e IDs
      formDataToSend.append("clubId", clubId.toString());

      // 2. Datos JSON
      formDataToSend.append(
        "clubData",
        JSON.stringify({
          nombre: formData.nombre,
          subdominio: formData.subdominio,
          color_primario: formData.color_primario,
          color_secundario: formData.color_secundario,
          color_texto: formData.color_texto,
          texto_bienvenida_titulo: formData.texto_bienvenida_titulo,
          texto_bienvenida_subtitulo: formData.texto_bienvenida_subtitulo,
          marcas: formData.marcas,
          logo_url: formData.logo_url,
          imagen_hero_url: formData.imagen_hero_url,
          email: formData.email,
          usuario_instagram: formData.usuario_instagram,
          telefono: formData.telefono,
          calle: formData.calle,
          altura: formData.altura,
          barrio: formData.barrio,
        })
      );

      formDataToSend.append(
        "nosotrosData",
        JSON.stringify({
          activo_nosotros: nosotrosData.activo_nosotros,
          historia_titulo: nosotrosData.historia_titulo,
          hero_descripcion: nosotrosData.hero_descripcion,
          // Preservamos los otros campos
          historia_contenido: nosotrosData.historia_contenido,
          frase_cierre: nosotrosData.frase_cierre,
          galeria_inicio: nosotrosData.galeria_inicio,
          valores: nosotrosData.valores,
        })
      );

      // 3. Archivos Nuevos
      if (logoFile) formDataToSend.append("logoFile", logoFile);
      if (heroFile) formDataToSend.append("heroFile", heroFile);

      if (newGalleryFiles.length > 0) {
        newGalleryFiles.forEach((file) => {
          formDataToSend.append("galleryFiles", file);
        });
      }

      Object.keys(brandFiles).forEach((brandId) => {
        const file = brandFiles[brandId];
        formDataToSend.append(`brand_file_${brandId}`, file);
      });

      // 4. ENVIAR A LA API
      const response = await fetch("/api/admin/club/update", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error en la actualización");
      }

      setBrandFiles({});
      setLogoFile(null);
      setHeroFile(null);
      setNewGalleryFiles([]);
      setNewGalleryPreviews([]);

      alert("¡Todos los cambios guardados correctamente!");
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getPreviewTitle = () => {
    if (activeTab === "nosotros") return "Sección Nosotros (Home)";
    return "Página de Inicio (Home)";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 -m-6 md:-m-10">
      {/* BOTÓN FLOTANTE MÓVIL */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-2 font-bold hover:scale-105 active:scale-95 transition-all border-2 border-green-500"
          title="Guardar cambios"
          aria-label="Guardar todos los cambios"
        >
          {saving ? (
            <Loader2 className="animate-spin w-6 h-6" />
          ) : (
            <Save className="w-6 h-6" />
          )}
          <span>Guardar</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 pb-32">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              Personalización del Club
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Gestiona la identidad y el contenido del Home.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="hidden md:flex bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold gap-2 items-center shadow-lg hover:-translate-y-1 disabled:opacity-70"
            title="Guardar todos los cambios"
            aria-label="Guardar todos los cambios"
          >
            {saving ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Guardar Todo
          </button>
        </div>

        {/* --- TABS --- */}
        <div className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          {[
            { id: "identidad", label: "Identidad & Hero", icon: Monitor },
            { id: "nosotros", label: "Sobre Nosotros (Home)", icon: BookOpen },
            { id: "estilo", label: "Colores & Textos", icon: Palette },
            { id: "contacto", label: "Contacto", icon: MapPin },
            { id: "marcas", label: "Marcas", icon: Type },
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
              title={`Ver sección ${tab.label}`}
              aria-label={`Ver sección ${tab.label}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            {/* TAB IDENTIDAD */}
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
                      aria-label="Nombre del club"
                      title="Nombre del club"
                    />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 mb-4 mt-6">
                    Logo
                  </h2>
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-28 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                      {formData.logo_url ? (
                        <Image
                          key={formData.logo_url}
                          src={formData.logo_url}
                          alt="Logo"
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Sin Logo</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 flex gap-2 items-center text-sm w-fit"
                        title="Subir imagen de logo"
                      >
                        <UploadCloud className="w-4 h-4" /> Subir Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e, "logo")}
                          title="Seleccionar archivo de logo"
                          aria-label="Seleccionar archivo de logo"
                        />
                      </label>
                      {formData.logo_url && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 flex gap-2 items-center text-sm w-fit"
                          title="Eliminar logo actual"
                          aria-label="Eliminar logo actual"
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
                        className="cursor-pointer bg-white text-slate-900 px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform flex gap-2"
                        title="Cambiar imagen de portada"
                      >
                        <UploadCloud className="w-5 h-5" /> Cambiar
                        <input
                          type="file"
                          accept="image/*,video/mp4,video/webm"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e, "hero")}
                          title="Seleccionar archivo de portada"
                          aria-label="Seleccionar archivo de portada"
                        />
                      </label>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB NOSOTROS (HOME PREVIEW) */}
            {activeTab === "nosotros" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {/* TOGGLE VISIBILIDAD */}
                <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800">Sección Home</h3>
                    <p className="text-xs text-slate-500">
                      Mostrar resumen en la página principal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleNosotrosChange(
                        "activo_nosotros",
                        !nosotrosData.activo_nosotros
                      )
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                      nosotrosData.activo_nosotros
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                    title={
                      nosotrosData.activo_nosotros
                        ? "Ocultar sección"
                        : "Mostrar sección"
                    }
                    aria-label={
                      nosotrosData.activo_nosotros
                        ? "Ocultar sección"
                        : "Mostrar sección"
                    }
                  >
                    {nosotrosData.activo_nosotros ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                    {nosotrosData.activo_nosotros ? "Visible" : "Oculto"}
                  </button>
                </section>

                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Título de la Sección
                      </label>
                      <input
                        type="text"
                        value={nosotrosData.historia_titulo}
                        onChange={(e) =>
                          handleNosotrosChange(
                            "historia_titulo",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="Ej: Nuestra Pasión"
                        aria-label="Título sección nosotros"
                        title="Título sección nosotros"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Resumen (Home)
                      </label>
                      <textarea
                        rows={3}
                        value={nosotrosData.hero_descripcion}
                        onChange={(e) =>
                          handleNosotrosChange(
                            "hero_descripcion",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl resize-none"
                        placeholder="Breve descripción para el inicio..."
                        aria-label="Resumen home"
                        title="Resumen home"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-purple-600" /> Slider
                      Home
                    </h2>
                    <label
                      className="cursor-pointer text-blue-600 text-xs font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex gap-1 items-center"
                      title="Subir imágenes"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleGallerySelect}
                        aria-label="Seleccionar imágenes slider"
                        title="Seleccionar imágenes slider"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {nosotrosData.galeria_inicio.map((url, i) => (
                      <div
                        key={`saved-${i}`}
                        className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group"
                      >
                        <Image
                          src={url}
                          alt="Gallery"
                          fill
                          className="object-cover"
                        />
                        {/* BOTÓN DE ELIMINAR SIEMPRE VISIBLE */}
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(i, false)}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow-md z-10 hover:bg-red-700 transition-colors"
                          aria-label="Eliminar imagen"
                          title="Eliminar imagen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {newGalleryPreviews.map((url, i) => (
                      <div
                        key={`new-${i}`}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-400 group"
                      >
                        <Image
                          src={url}
                          alt="New"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] px-2 py-0.5 font-bold z-10">
                          NUEVA
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(i, true)}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow-md z-10 hover:bg-red-700 transition-colors"
                          aria-label="Cancelar imagen nueva"
                          title="Cancelar imagen nueva"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {nosotrosData.galeria_inicio.length === 0 &&
                      newGalleryPreviews.length === 0 && (
                        <div className="col-span-4 text-center py-6 text-sm text-slate-400 border-2 border-dashed rounded-xl">
                          Sin imágenes.
                        </div>
                      )}
                  </div>
                </section>
              </div>
            )}

            {/* TAB ESTILO */}
            {activeTab === "estilo" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Textos del Home
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Título Principal
                      </label>
                      <input
                        type="text"
                        value={formData.texto_bienvenida_titulo}
                        onChange={(e) =>
                          handleChange(
                            "texto_bienvenida_titulo",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="EL MEJOR LUGAR..."
                        aria-label="Título principal home"
                        title="Título principal home"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Leyenda (Subtítulo)
                      </label>
                      <input
                        type="text"
                        value={formData.texto_bienvenida_subtitulo}
                        onChange={(e) =>
                          handleChange(
                            "texto_bienvenida_subtitulo",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="Subtítulo..."
                        aria-label="Subtítulo home"
                        title="Subtítulo home"
                      />
                    </div>
                  </div>
                </section>
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Colores
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Color Primario
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.color_primario}
                          onChange={(e) =>
                            handleChange("color_primario", e.target.value)
                          }
                          className="h-10 w-16 rounded cursor-pointer border"
                          aria-label="Seleccionar color primario"
                          title="Seleccionar color primario"
                        />
                        <input
                          type="text"
                          value={formData.color_primario}
                          onChange={(e) =>
                            handleChange("color_primario", e.target.value)
                          }
                          className="flex-1 px-4 border border-slate-300 rounded-xl uppercase"
                          placeholder="#000000"
                          aria-label="Código hexadecimal color primario"
                          title="Código hexadecimal color primario"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Color Secundario
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.color_secundario}
                          onChange={(e) =>
                            handleChange("color_secundario", e.target.value)
                          }
                          className="h-10 w-16 rounded cursor-pointer border"
                          aria-label="Seleccionar color secundario"
                          title="Seleccionar color secundario"
                        />
                        <input
                          type="text"
                          value={formData.color_secundario}
                          onChange={(e) =>
                            handleChange("color_secundario", e.target.value)
                          }
                          className="flex-1 px-4 border border-slate-300 rounded-xl uppercase"
                          placeholder="#000000"
                          aria-label="Código hexadecimal color secundario"
                          title="Código hexadecimal color secundario"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB CONTACTO */}
            {activeTab === "contacto" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Datos de Contacto
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleChange("email", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                          placeholder="contacto@email.com"
                          aria-label="Email de contacto"
                          title="Email de contacto"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Instagram
                      </label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.usuario_instagram}
                          onChange={(e) =>
                            handleChange("usuario_instagram", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                          placeholder="@usuario"
                          aria-label="Usuario de Instagram"
                          title="Usuario de Instagram"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.telefono}
                          onChange={(e) =>
                            handleChange("telefono", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                          placeholder="+54 9..."
                          aria-label="Teléfono WhatsApp"
                          title="Teléfono WhatsApp"
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
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Calle
                      </label>
                      <input
                        type="text"
                        value={formData.calle}
                        onChange={(e) => handleChange("calle", e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="Av. Principal"
                        aria-label="Calle"
                        title="Calle"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Altura
                      </label>
                      <input
                        type="text"
                        value={formData.altura}
                        onChange={(e) => handleChange("altura", e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="123"
                        aria-label="Altura"
                        title="Altura"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Barrio
                      </label>
                      <input
                        type="text"
                        value={formData.barrio}
                        onChange={(e) => handleChange("barrio", e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="Centro"
                        aria-label="Barrio"
                        title="Barrio"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB MARCAS */}
            {activeTab === "marcas" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800">Marcas</h2>
                    <button
                      type="button"
                      onClick={addMarca}
                      className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1"
                      aria-label="Agregar marca"
                      title="Agregar marca"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.marcas.map((marca, i) => (
                      <div
                        key={marca.id}
                        className="flex flex-col gap-2 p-4 border border-slate-100 rounded-xl bg-slate-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleMarcaTipo(marca.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                marca.tipo === "texto"
                                  ? "bg-blue-100 text-blue-600"
                                  : "text-slate-400 hover:bg-slate-200"
                              }`}
                              title="Usar Texto"
                              aria-label="Usar texto"
                            >
                              <AlignLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleMarcaTipo(marca.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                marca.tipo === "imagen"
                                  ? "bg-blue-100 text-blue-600"
                                  : "text-slate-400 hover:bg-slate-200"
                              }`}
                              title="Usar Imagen"
                              aria-label="Usar imagen"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-500 uppercase">
                              {marca.tipo}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMarca(marca.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Eliminar marca"
                            aria-label="Eliminar marca"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {marca.tipo === "texto" ? (
                          <input
                            type="text"
                            value={marca.valor}
                            onChange={(e) =>
                              updateMarcaValor(marca.id, e.target.value)
                            }
                            className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-semibold"
                            placeholder="Nombre de marca"
                            aria-label="Nombre de marca"
                            title="Nombre de marca"
                          />
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                              {marca.valor ? (
                                <Image
                                  src={marca.valor}
                                  alt="Marca"
                                  fill
                                  className="object-contain p-1"
                                />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-slate-300" />
                              )}
                            </div>
                            <label
                              className="cursor-pointer bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50"
                              title="Subir archivo de marca"
                            >
                              Subir Archivo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleBrandFileChange(marca.id, e)
                                }
                                aria-label="Subir archivo de marca"
                                title="Subir archivo de marca"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* --- PREVIEW DERECHA --- */}
          <div className="sticky top-6 hidden lg:block">
            <div className="bg-[#0b0d12] rounded-[2rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden h-[800px] relative flex flex-col">
              <div className="bg-slate-800 py-2 text-center text-xs text-slate-400">
                Vista Previa: {getPreviewTitle()}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
                {/* HERO PREVIEW */}
                <div className="relative h-[300px] shrink-0 flex items-center justify-center">
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
                  <div className="relative z-10 text-center px-6 mt-6">
                    {formData.logo_url && (
                      <div className="relative w-20 h-20 mx-auto mb-2">
                        <Image
                          key={formData.logo_url}
                          src={formData.logo_url}
                          alt="Logo"
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    {!formData.logo_url && (
                      <h1 className="text-xl font-bold text-white mb-2">
                        {formData.nombre.toUpperCase()}
                      </h1>
                    )}
                    <h2 className="text-xl font-bold text-white mb-1 leading-tight">
                      {formData.texto_bienvenida_titulo}
                    </h2>
                  </div>
                </div>

                {/* NOSOTROS PREVIEW */}
                <div
                  className="p-6 bg-[#0b0d12]"
                  style={{ backgroundColor: formData.color_secundario }}
                >
                  <div
                    className="inline-block px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase mb-3"
                    style={{ color: formData.color_primario }}
                  >
                    Sobre Nosotros
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {nosotrosData.historia_titulo || "Título"}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {nosotrosData.hero_descripcion || "Descripción..."}
                  </p>

                  <div className="relative aspect-video w-full bg-slate-800 rounded-lg overflow-hidden border border-white/10">
                    {nosotrosData.galeria_inicio[0] || newGalleryPreviews[0] ? (
                      <Image
                        src={
                          nosotrosData.galeria_inicio[0] ||
                          newGalleryPreviews[0]
                        }
                        alt="Slide"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                        Slider
                      </div>
                    )}
                  </div>
                </div>

                {/* MARCAS */}
                <div className="bg-[#050608] py-4 border-y border-white/5 overflow-hidden flex gap-4 px-4 opacity-50">
                  {formData.marcas.slice(0, 3).map((m) =>
                    m.tipo === "imagen" && m.valor ? (
                      <div key={m.id} className="w-8 h-8 relative grayscale">
                        <Image
                          src={m.valor}
                          alt="m"
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <span
                        key={m.id}
                        className="text-gray-500 text-xs font-bold"
                      >
                        {m.valor}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
