"use client";

import { useState } from "react";
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
} from "lucide-react";

interface Props {
  clubId: number;
  initialData: any;
}

export default function QuinchoForm({ clubId, initialData }: Props) {
  const [saving, setSaving] = useState(false);

  // Estado de archivos nuevos para subir
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [data, setData] = useState({
    activo: initialData?.activo || false,
    titulo: initialData?.titulo || "Nuestro Quincho",
    descripcion: initialData?.descripcion || "",
    precio: initialData?.precio || "",
    // Ahora es un array
    galeria: (initialData?.galeria as string[]) || [],
    whatsapp_numero: initialData?.whatsapp_numero || "",
    whatsapp_mensaje:
      initialData?.whatsapp_mensaje || "Hola, quiero reservar el quincho.",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setNewFiles((prev) => [...prev, ...filesArr]);

      // Crear previews locales
      const newUrls = filesArr.map((file) => URL.createObjectURL(file));
      setNewPreviews((prev) => [...prev, ...newUrls]);
    }
  };

  // Borrar imagen existente (del servidor)
  const removeExistingImage = (indexToRemove: number) => {
    setData((prev) => ({
      ...prev,
      galeria: prev.galeria.filter((_, i) => i !== indexToRemove),
    }));
  };

  // Borrar imagen nueva (aún no subida)
  const removeNewImage = (indexToRemove: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setNewPreviews((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("clubId", clubId.toString());

      // Enviamos el objeto data que contiene las URLs que queremos CONSERVAR
      formData.append("settings", JSON.stringify(data));

      // Adjuntamos los nuevos archivos
      newFiles.forEach((file) => {
        formData.append("galleryFiles", file);
      });

      const res = await fetch("/api/admin/quinchos/update", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Error al guardar");

      alert("Datos del quincho actualizados");
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
          title={data.activo ? "Desactivar página" : "Activar página"}
          aria-label={data.activo ? "Desactivar página" : "Activar página"}
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
          {/* GALERÍA DE FOTOS */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600" /> Galería de
                Fotos
              </h2>
              <label
                className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-100 flex gap-2 items-center transition-colors"
                title="Agregar fotos"
              >
                <Plus className="w-4 h-4" /> Agregar Fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  title="Seleccionar archivos"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Imágenes guardadas */}
              {data.galeria.map((url, i) => (
                <div
                  key={`saved-${i}`}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                >
                  <Image
                    src={url}
                    alt="Quincho saved"
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    onClick={() => removeExistingImage(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar imagen"
                    aria-label="Eliminar imagen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Imágenes nuevas (previews) */}
              {newPreviews.map((url, i) => (
                <div
                  key={`new-${i}`}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-green-400 group"
                >
                  <Image
                    src={url}
                    alt="Quincho new"
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                  <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] px-2 py-0.5 font-bold">
                    NUEVA
                  </div>
                  <button
                    onClick={() => removeNewImage(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Cancelar subida"
                    aria-label="Cancelar subida"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {data.galeria.length === 0 && newPreviews.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm">
                    No hay imágenes en la galería.
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
                    title="Título de la página"
                    aria-label="Título de la página"
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
                      title="Precio por hora"
                      aria-label="Precio por hora"
                    />
                  </div>
                  {/* AQUI ESTABA EL ERROR: Se escaparon las comillas */}
                  <p className="text-xs text-slate-400 mt-1">
                    Este valor se mostrará acompañado del símbolo $ y la leyenda
                    &quot;/ hora&quot;.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Descripción y Comodidades
                </label>
                <textarea
                  rows={5}
                  value={data.descripcion}
                  onChange={(e) =>
                    setData({ ...data, descripcion: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl resize-none"
                  placeholder="Capacidad, parrilla, aire acondicionado, etc..."
                  title="Descripción del quincho"
                  aria-label="Descripción del quincho"
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
                  Número WhatsApp (Solo números)
                </label>
                <input
                  type="text"
                  value={data.whatsapp_numero}
                  onChange={(e) =>
                    setData({ ...data, whatsapp_numero: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl"
                  placeholder="Ej: 54911..."
                  title="Número de WhatsApp"
                  aria-label="Número de WhatsApp"
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
                  placeholder="Mensaje predeterminado..."
                  title="Mensaje automático"
                  aria-label="Mensaje automático"
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
          title="Guardar cambios"
          aria-label="Guardar cambios"
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
