"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Loader2,
  Save,
  Home,
  MessageCircle,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  X,
  Plus,
  ImageIcon,
  ArrowLeft,
  ArrowRight,
  Move,
} from "lucide-react";

interface Props {
  clubId: number;
  initialData: any;
}

// Tipo unificado para manejar imágenes existentes y nuevas en la misma lista
type GalleryItem = {
  id: string; // ID único para React keys
  type: "existing" | "new";
  url: string; // URL real (existing) o Blob URL (new)
  file?: File; // Solo para type 'new'
};

export default function QuinchoForm({ clubId, initialData }: Props) {
  const [saving, setSaving] = useState(false);

  // Estado unificado de la galería
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  const [data, setData] = useState({
    activo: initialData?.activo || false,
    titulo: initialData?.titulo || "Nuestro Quincho",
    descripcion: initialData?.descripcion || "",
    precio: initialData?.precio || "",
    whatsapp_numero: initialData?.whatsapp_numero || "",
    whatsapp_mensaje:
      initialData?.whatsapp_mensaje || "Hola, quiero reservar el quincho.",
  });

  // Inicializar galería al cargar
  useEffect(() => {
    if (initialData?.galeria && Array.isArray(initialData.galeria)) {
      const existingItems: GalleryItem[] = initialData.galeria.map(
        (url: string) => ({
          id: url, // Usamos la URL como ID para las existentes
          type: "existing",
          url: url,
        }),
      );
      setGalleryItems(existingItems);
    }
  }, [initialData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);

      const newItems: GalleryItem[] = filesArr.map((file) => ({
        id: `new-${Date.now()}-${Math.random()}`, // ID temporal único
        type: "new",
        url: URL.createObjectURL(file), // Preview local
        file: file,
      }));

      setGalleryItems((prev) => [...prev, ...newItems]);
      e.target.value = ""; // Reset input
    }
  };

  const removeImage = (idToRemove: string) => {
    setGalleryItems((prev) => {
      const item = prev.find((i) => i.id === idToRemove);
      // Si es una imagen nueva, liberamos memoria del blob
      if (item?.type === "new" && item.url) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
  };

  // Función para mover elementos en el array
  const moveImage = (index: number, direction: "left" | "right") => {
    const newItems = [...galleryItems];
    const targetIndex = direction === "left" ? index - 1 : index + 1;

    // Validar límites
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap
    [newItems[index], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[index],
    ];
    setGalleryItems(newItems);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clubId", clubId.toString());
      formData.append("settings", JSON.stringify(data));

      // PREPARAR ORDEN Y ARCHIVOS
      // 1. Separamos los archivos físicos nuevos
      // 2. Creamos un array "mapa" que le dice al backend el orden:
      //    - Si es existente: manda la URL.
      //    - Si es nuevo: manda un placeholder "new-file-X" donde X es el índice en el array de archivos subidos.

      const galleryOrder: string[] = [];
      const filesToUpload: File[] = [];

      galleryItems.forEach((item) => {
        if (item.type === "existing") {
          galleryOrder.push(item.url);
        } else if (item.type === "new" && item.file) {
          // Es nuevo. Añadimos el archivo a la cola de subida
          const fileIndex = filesToUpload.length;
          filesToUpload.push(item.file);
          // En el orden, ponemos una referencia a este índice
          galleryOrder.push(`new-file-${fileIndex}`);
        }
      });

      // Adjuntamos el mapa de orden
      formData.append("galleryOrder", JSON.stringify(galleryOrder));

      // Adjuntamos los archivos físicos
      filesToUpload.forEach((file) => {
        formData.append("galleryFiles", file);
      });

      const res = await fetch("/api/admin/quinchos/update", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Error al guardar");

      alert("Datos actualizados correctamente");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER & ACTIVACIÓN */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Home className="w-5 h-5 text-orange-600" /> Configuración del
            Quincho
          </h2>
          <p className="text-sm text-slate-500">
            Activa esta página si tu club ofrece alquiler de espacios.
          </p>
        </div>
        <button
          onClick={() => setData((prev) => ({ ...prev, activo: !prev.activo }))}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
            data.activo
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {data.activo ? (
            <ToggleRight className="w-6 h-6" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
          {data.activo ? "Visible en la Web" : "Oculto"}
        </button>
      </section>

      {data.activo && (
        <>
          {/* GALERÍA DE FOTOS (ORDENABLE) */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-600" /> Galería de
                  Fotos
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Usa las flechas para ordenar las fotos.
                </p>
              </div>

              <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-100 flex gap-2 items-center transition-colors">
                <Plus className="w-4 h-4" /> Agregar Fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {galleryItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`relative aspect-square rounded-xl overflow-hidden border group transition-all ${
                    item.type === "new"
                      ? "border-green-400 bg-green-50"
                      : "border-slate-200 bg-slate-100"
                  }`}
                >
                  <Image
                    src={item.url}
                    alt="Quincho"
                    fill
                    className="object-cover"
                    sizes="200px"
                  />

                  {/* Overlay Oscuro al Hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none" />

                  {/* Etiqueta de "Nueva" */}
                  {item.type === "new" && (
                    <div className="absolute top-0 left-0 bg-green-500 text-white text-[9px] px-2 py-0.5 font-bold z-10">
                      NUEVA
                    </div>
                  )}

                  {/* CONTROLES (Visibles al hover) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2 z-20">
                    {/* Botón Mover Izquierda */}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => moveImage(index, "left")}
                        className="p-1.5 bg-white text-slate-700 rounded-full hover:bg-blue-50 hover:text-blue-600 shadow-sm"
                        title="Mover antes"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}

                    {/* Botón Borrar */}
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      className="p-1.5 bg-white text-red-500 rounded-full hover:bg-red-50 shadow-sm"
                      title="Eliminar"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Botón Mover Derecha */}
                    {index < galleryItems.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveImage(index, "right")}
                        className="p-1.5 bg-white text-slate-700 rounded-full hover:bg-blue-50 hover:text-blue-600 shadow-sm"
                        title="Mover después"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Indicador de posición (Móvil/Visual) */}
                  <div className="absolute bottom-1 right-2 text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 drop-shadow-md">
                    #{index + 1}
                  </div>
                </div>
              ))}

              {galleryItems.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm">
                    No hay imágenes. Sube algunas para comenzar.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* INFORMACIÓN DE TEXTO */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" /> Información
              General
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Título de la Página
                  </label>
                  <input
                    type="text"
                    value={data.titulo}
                    onChange={(e) =>
                      setData({ ...data, titulo: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                    placeholder="Ej: Nuestro Quincho"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Precio por Hora ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={data.precio}
                      onChange={(e) =>
                        setData({ ...data, precio: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl"
                      placeholder="Ej: 15.000"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ingresa <b>0</b> para ocultar el precio y mostrar
                    &quot;Consultar&quot;.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={5}
                  value={data.descripcion}
                  onChange={(e) =>
                    setData({ ...data, descripcion: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl resize-none"
                  placeholder="Detalles..."
                />
              </div>
            </div>
          </section>

          {/* WHATSAPP */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" /> Contacto para
              Reservas
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Número WhatsApp
                </label>
                <input
                  type="text"
                  value={data.whatsapp_numero}
                  onChange={(e) =>
                    setData({ ...data, whatsapp_numero: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                  placeholder="Ej: 54911..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Mensaje Automático
                </label>
                <input
                  type="text"
                  value={data.whatsapp_mensaje}
                  onChange={(e) =>
                    setData({ ...data, whatsapp_mensaje: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                  placeholder="Hola..."
                />
              </div>
            </div>
          </section>
        </>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 shadow-lg"
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
