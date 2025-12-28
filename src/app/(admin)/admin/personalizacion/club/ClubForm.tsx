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
  ToggleLeft,
  ToggleRight,
  X,
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

  // --- ESTADO NOSOTROS ---
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

  const [newGalleryFiles, setNewGalleryFiles] = useState<File[]>([]);
  const [newGalleryPreviews, setNewGalleryPreviews] = useState<string[]>([]);

  // Helpers
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|mov)$/i);

  // === EFECTO FAVICON ===
  useEffect(() => {
    const updateFavicon = (url: string) => {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = url;
    };

    if (formData.logo_url) {
      const isRemote = formData.logo_url.startsWith("http");
      const faviconUrl = isRemote
        ? `${formData.logo_url}?t=${new Date().getTime()}`
        : formData.logo_url;
      updateFavicon(faviconUrl);
    } else {
      updateFavicon("/icon.png");
    }
  }, [formData.logo_url]);

  // === HANDLERS ===
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

  // Nosotros Handlers
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
      formDataToSend.append("clubId", clubId.toString());

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
          historia_contenido: nosotrosData.historia_contenido,
          frase_cierre: nosotrosData.frase_cierre,
          galeria_inicio: nosotrosData.galeria_inicio,
          valores: nosotrosData.valores,
        })
      );

      if (logoFile) formDataToSend.append("logoFile", logoFile);
      if (heroFile) formDataToSend.append("heroFile", heroFile);
      if (newGalleryFiles.length > 0) {
        newGalleryFiles.forEach((file) =>
          formDataToSend.append("galleryFiles", file)
        );
      }
      Object.keys(brandFiles).forEach((brandId) => {
        formDataToSend.append(`brand_file_${brandId}`, brandFiles[brandId]);
      });

      const response = await fetch("/api/admin/club/update", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Error");

      setBrandFiles({});
      setLogoFile(null);
      setHeroFile(null);
      setNewGalleryFiles([]);
      setNewGalleryPreviews([]);

      alert("¡Cambios guardados correctamente!");
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
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
      <div className="md:hidden fixed bottom-6 right-6 z-[9999]">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20 active:scale-95 transition-all hover:bg-green-700"
          title="Guardar cambios"
          aria-label="Guardar todos los cambios"
        >
          {saving ? (
            <Loader2 className="animate-spin w-6 h-6" />
          ) : (
            <Save className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 pb-32">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              Personalización
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Gestiona la identidad y el contenido.
            </p>
          </div>
          {/* Botón Desktop */}
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
            { id: "identidad", label: "Identidad", icon: Monitor },
            { id: "nosotros", label: "Nosotros", icon: BookOpen },
            { id: "estilo", label: "Estilo", icon: Palette },
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
              title={`Ir a sección ${tab.label}`}
              aria-label={`Ir a sección ${tab.label}`}
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
                      Nombre
                    </label>
                    <input
                      id="nombre_club"
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleChange("nombre", e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                      placeholder="Nombre del Club"
                      title="Nombre del club"
                      aria-label="Nombre del club"
                    />
                  </div>

                  <h2 className="text-lg font-bold text-slate-800 mb-4 mt-6">
                    Logo
                  </h2>
                  <div className="flex items-center gap-6 mt-4">
                    <div className="relative w-20 h-20 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                      {formData.logo_url ? (
                        <Image
                          src={formData.logo_url}
                          alt="Logo"
                          fill
                          className="object-contain p-2"
                        />
                      ) : (
                        <span className="text-xs">Sin Logo</span>
                      )}
                    </div>
                    <label
                      className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 text-sm"
                      title="Subir un nuevo logo"
                    >
                      Subir Logo
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
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Eliminar logo"
                        aria-label="Eliminar logo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Portada (Hero)
                  </h2>
                  <div className="relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                    {formData.imagen_hero_url ? (
                      isVideo(formData.imagen_hero_url) ? (
                        <video
                          src={formData.imagen_hero_url}
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          loop
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
                      <div className="flex flex-col items-center text-slate-400">
                        <ImageIcon className="w-10 h-10 mb-2" />
                        <span>Sin Portada</span>
                      </div>
                    )}
                    <label
                      className="absolute bottom-4 right-4 cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-lg font-bold shadow-md hover:bg-slate-50 text-sm flex items-center gap-2"
                      title="Cambiar imagen de portada"
                    >
                      <UploadCloud className="w-4 h-4" /> Cambiar
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
                </section>
              </div>
            )}

            {/* TAB NOSOTROS */}
            {activeTab === "nosotros" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
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
                    aria-label="Alternar visibilidad sección nosotros"
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
                  <div className="mb-4">
                    <label
                      htmlFor="historia_titulo"
                      className="block text-sm font-semibold text-slate-700 mb-1"
                    >
                      Título
                    </label>
                    <input
                      id="historia_titulo"
                      type="text"
                      value={nosotrosData.historia_titulo}
                      onChange={(e) =>
                        handleNosotrosChange("historia_titulo", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                      placeholder="Ej: Nuestra Historia"
                      title="Título de la sección nosotros"
                      aria-label="Título de la sección nosotros"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="hero_descripcion"
                      className="block text-sm font-semibold text-slate-700 mb-1"
                    >
                      Resumen
                    </label>
                    <textarea
                      id="hero_descripcion"
                      rows={3}
                      value={nosotrosData.hero_descripcion}
                      onChange={(e) =>
                        handleNosotrosChange("hero_descripcion", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl resize-none"
                      placeholder="Breve descripción..."
                      title="Resumen para el home"
                      aria-label="Resumen para el home"
                    />
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800">
                      Galería (Slider Home)
                    </h2>
                    <label
                      className="cursor-pointer text-blue-600 text-xs font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg flex gap-1 items-center"
                      title="Agregar imágenes"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleGallerySelect}
                        title="Seleccionar imágenes para slider"
                        aria-label="Seleccionar imágenes para slider"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {nosotrosData.galeria_inicio.map((url, i) => (
                      <div
                        key={`saved-${i}`}
                        className="relative aspect-square rounded-lg overflow-hidden border group"
                      >
                        <Image
                          src={url}
                          alt="Gallery"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(i, false)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar imagen"
                          aria-label="Eliminar imagen"
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
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(i, true)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Cancelar subida"
                          aria-label="Cancelar subida"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* TAB ESTILO */}
            {activeTab === "estilo" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">
                    Textos Home
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="titulo_home"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Título Principal
                      </label>
                      <input
                        id="titulo_home"
                        type="text"
                        value={formData.texto_bienvenida_titulo}
                        onChange={(e) =>
                          handleChange(
                            "texto_bienvenida_titulo",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="Ej: Bienvenido al Club"
                        title="Título principal del home"
                        aria-label="Título principal del home"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="subtitulo_home"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Subtítulo
                      </label>
                      <input
                        id="subtitulo_home"
                        type="text"
                        value={formData.texto_bienvenida_subtitulo}
                        onChange={(e) =>
                          handleChange(
                            "texto_bienvenida_subtitulo",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                        placeholder="Ej: El mejor lugar..."
                        title="Subtítulo del home"
                        aria-label="Subtítulo del home"
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
                        Primario
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.color_primario}
                          onChange={(e) =>
                            handleChange("color_primario", e.target.value)
                          }
                          className="h-10 w-16 rounded cursor-pointer border"
                          title="Seleccionar color primario"
                          aria-label="Seleccionar color primario"
                        />
                        <input
                          type="text"
                          value={formData.color_primario}
                          onChange={(e) =>
                            handleChange("color_primario", e.target.value)
                          }
                          className="flex-1 px-4 border border-slate-300 rounded-xl uppercase"
                          placeholder="#000000"
                          title="Código hexadecimal color primario"
                          aria-label="Código hexadecimal color primario"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Secundario
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.color_secundario}
                          onChange={(e) =>
                            handleChange("color_secundario", e.target.value)
                          }
                          className="h-10 w-16 rounded cursor-pointer border"
                          title="Seleccionar color secundario"
                          aria-label="Seleccionar color secundario"
                        />
                        <input
                          type="text"
                          value={formData.color_secundario}
                          onChange={(e) =>
                            handleChange("color_secundario", e.target.value)
                          }
                          className="flex-1 px-4 border border-slate-300 rounded-xl uppercase"
                          placeholder="#000000"
                          title="Código hexadecimal color secundario"
                          aria-label="Código hexadecimal color secundario"
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
                          placeholder="contacto@email.com"
                          title="Email de contacto"
                          aria-label="Email de contacto"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="instagram"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        Instagram
                      </label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          id="instagram"
                          type="text"
                          value={formData.usuario_instagram}
                          onChange={(e) =>
                            handleChange("usuario_instagram", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                          placeholder="@usuario"
                          title="Usuario de instagram"
                          aria-label="Usuario de instagram"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="telefono"
                        className="block text-sm font-semibold text-slate-700 mb-1"
                      >
                        WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          id="telefono"
                          type="text"
                          value={formData.telefono}
                          onChange={(e) =>
                            handleChange("telefono", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                          placeholder="+54 9..."
                          title="Número de whatsapp"
                          aria-label="Número de whatsapp"
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
                        placeholder="Calle Principal"
                        title="Nombre de la calle"
                        aria-label="Nombre de la calle"
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
                        placeholder="123"
                        title="Altura o numeración"
                        aria-label="Altura o numeración"
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
                        placeholder="Centro"
                        title="Barrio o localidad"
                        aria-label="Barrio o localidad"
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
                      title="Agregar nueva marca"
                      aria-label="Agregar nueva marca"
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
                              title="Usar texto"
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
                              title="Usar imagen"
                              aria-label="Usar imagen"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
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
                            className="w-full bg-white px-3 py-2 border border-slate-200 rounded-lg"
                            placeholder="Nombre de marca"
                            title="Nombre de la marca"
                            aria-label="Nombre de la marca"
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
                                title="Seleccionar archivo de marca"
                                aria-label="Seleccionar archivo de marca"
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

          {/* PREVIEW DERECHA */}
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
                        className="w-full h-full object-cover opacity-60"
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
                          src={formData.logo_url}
                          alt="Logo"
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-white mb-1 leading-tight">
                      {formData.texto_bienvenida_titulo}
                    </h2>
                  </div>
                </div>

                {/* PREVIEW DINÁMICA */}
                <div
                  className="p-6 bg-[#0b0d12]"
                  style={{ backgroundColor: formData.color_secundario }}
                >
                  {/* Título de sección Nosotros si está activa */}
                  <div
                    className="inline-block px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase mb-3"
                    style={{ color: formData.color_primario }}
                  >
                    {activeTab === "nosotros"
                      ? "Sección Nosotros"
                      : "Contenido"}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {activeTab === "nosotros"
                      ? nosotrosData.historia_titulo || "Título"
                      : "Título de Sección"}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {activeTab === "nosotros"
                      ? nosotrosData.hero_descripcion || "Descripción..."
                      : "Contenido de ejemplo..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
