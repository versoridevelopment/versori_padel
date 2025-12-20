"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/utils/canvasUtils";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  UploadCloud,
  User,
  Save,
  X,
  Phone,
  Instagram,
  ZoomIn,
  Check,
} from "lucide-react";
import { buildStaffPath, PUBLIC_MEDIA_BUCKET } from "@/lib/storage/paths";

// Tipo sincronizado
type Profesor = {
  id_profesor?: number;
  nombre: string;
  telefono: string;
  instagram: string;
  foto_url: string; // Puede ser string vacío "" si no tiene foto
  descripcion?: string;
  id_club?: number;
};

interface Props {
  initialData: Profesor[];
  clubId: number;
  subdominio: string;
}

export default function ProfesoresClient({
  initialData,
  clubId,
  subdominio,
}: Props) {
  const [profesores, setProfesores] = useState<Profesor[]>(initialData);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  // --- ESTADOS PARA CROPPER ---
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [tempImgSrc, setTempImgSrc] = useState<string | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState<Profesor>({
    nombre: "",
    telefono: "",
    instagram: "",
    foto_url: "",
    descripcion: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- ACCIONES ---

  const handleEdit = (prof: Profesor) => {
    setFormData(prof);
    setEditingId(prof.id_profesor!);
    setSelectedFile(null);
  };

  const handleNew = () => {
    setFormData({
      nombre: "",
      telefono: "",
      instagram: "",
      foto_url: "",
      descripcion: "",
    });
    setEditingId("new");
    setSelectedFile(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar a este profesor?")) return;
    const { error } = await supabase
      .from("profesores")
      .delete()
      .eq("id_profesor", id);
    if (!error) {
      setProfesores((prev) => prev.filter((p) => p.id_profesor !== id));
      if (editingId === id) setEditingId(null);
    } else {
      alert("Error al eliminar");
    }
  };

  // --- MANEJO DE IMÁGENES ---

  // 1. Seleccionar archivo y abrir Cropper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setTempImgSrc(reader.result as string);
        setIsCropping(true);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // 2. Guardar Recorte
  const handleCropSave = async () => {
    try {
      if (!tempImgSrc || !croppedAreaPixels) return;
      const croppedFile = await getCroppedImg(tempImgSrc, croppedAreaPixels);

      setSelectedFile(croppedFile);
      setFormData((prev) => ({
        ...prev,
        foto_url: URL.createObjectURL(croppedFile),
      }));
      setIsCropping(false);
      setTempImgSrc(null);
    } catch (e) {
      console.error(e);
      alert("Error al recortar la imagen");
    }
  };

  // 3. NUEVO: Eliminar Foto (Volver a la genérica)
  const handleRemovePhoto = () => {
    if (!confirm("¿Quitar la foto de perfil?")) return;

    setFormData((prev) => ({ ...prev, foto_url: "" })); // URL vacía activa la imagen genérica
    setSelectedFile(null); // Limpiamos cualquier archivo pendiente de subida
  };

  // --- GUARDAR EN DB ---
  const handleSave = async () => {
    if (!formData.nombre) return alert("El nombre es obligatorio");
    setSaving(true);

    try {
      let finalUrl = formData.foto_url;

      // Si hay un archivo seleccionado (nuevo recorte), lo subimos
      if (selectedFile) {
        const path = buildStaffPath(clubId, selectedFile);
        const { error: upErr } = await supabase.storage
          .from(PUBLIC_MEDIA_BUCKET)
          .upload(path, selectedFile, { upsert: true });

        if (upErr) throw upErr;

        const { data } = supabase.storage
          .from(PUBLIC_MEDIA_BUCKET)
          .getPublicUrl(path);

        finalUrl = data.publicUrl;
      }

      // Payload para la base de datos
      const payload = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        instagram: formData.instagram,
        descripcion: formData.descripcion,
        foto_url: finalUrl, // Si se borró, esto enviará "" (string vacío)
        id_club: clubId,
      };

      if (editingId !== "new") {
        const { data, error } = await supabase
          .from("profesores")
          .update(payload)
          .eq("id_profesor", editingId)
          .select()
          .single();
        if (error) throw error;
        setProfesores((prev) =>
          prev.map((p) => (p.id_profesor === editingId ? data : p))
        );
      } else {
        const { data, error } = await supabase
          .from("profesores")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setProfesores((prev) => [...prev, data]);
      }

      setEditingId(null);
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 -m-6 md:-m-10 relative">
      {/* MODAL CROPPER */}
      {isCropping && tempImgSrc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl h-[60vh] bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
            <Cropper
              image={tempImgSrc}
              crop={crop}
              zoom={zoom}
              aspect={3 / 4}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          <div className="mt-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-xl border border-gray-700">
              <ZoomIn className="text-gray-400 w-5 h-5" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setIsCropping(false);
                  setTempImgSrc(null);
                  setSelectedFile(null);
                }}
                className="px-6 py-3 rounded-xl font-bold bg-gray-700 text-white hover:bg-gray-600 transition-colors flex gap-2 items-center"
              >
                <X className="w-5 h-5" /> Cancelar
              </button>
              <button
                onClick={handleCropSave}
                className="px-8 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 flex gap-2 items-center"
              >
                <Check className="w-5 h-5" /> Recortar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-[1600px] mx-auto space-y-8 pb-32">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              Equipo de Profesores
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Gestiona los perfiles que aparecen en{" "}
              <span className="font-semibold text-slate-700">
                {subdominio}.versori.com/profesores
              </span>
            </p>
          </div>
          {!editingId && (
            <button
              type="button"
              onClick={handleNew}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-1"
            >
              <Plus className="w-5 h-5" /> Nuevo Profesor
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* EDITOR */}
          <div className="space-y-6">
            {editingId ? (
              <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingId === "new"
                      ? "Agregar Profesor"
                      : "Editar Profesor"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-slate-400 hover:text-slate-600"
                    title="Cerrar"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* FOTO DE PERFIL */}
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-36 bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200 flex-shrink-0 shadow-sm group">
                      {formData.foto_url ? (
                        <Image
                          src={formData.foto_url}
                          alt="Avatar"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        // IMAGEN POR DEFECTO GENÉRICA
                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                          <User className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="upload_prof"
                        className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors flex gap-2 items-center text-sm w-fit"
                      >
                        <UploadCloud className="w-4 h-4" />
                        {formData.foto_url ? "Cambiar Foto" : "Subir Foto"}
                        <input
                          id="upload_prof"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                          title="Subir foto del profesor"
                        />
                      </label>

                      {/* BOTÓN ELIMINAR FOTO */}
                      {formData.foto_url && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors flex gap-2 items-center text-sm w-fit"
                          title="Eliminar foto de perfil"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar Foto
                        </button>
                      )}

                      <p className="text-xs text-slate-400 mt-1">
                        Formato vertical 3:4.
                      </p>
                    </div>
                  </div>

                  {/* Campos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <label
                        htmlFor="nombre"
                        className="block text-sm font-semibold text-slate-700 mb-2"
                      >
                        Nombre Completo
                      </label>
                      <input
                        id="nombre"
                        type="text"
                        value={formData.nombre}
                        onChange={(e) =>
                          setFormData({ ...formData, nombre: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                        placeholder="Ej: Raúl Acosta"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="telefono"
                        className="block text-sm font-semibold text-slate-700 mb-2"
                      >
                        Teléfono
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="telefono"
                          type="text"
                          value={formData.telefono}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              telefono: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                          placeholder="+54 9..."
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="instagram"
                        className="block text-sm font-semibold text-slate-700 mb-2"
                      >
                        Instagram
                      </label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="instagram"
                          type="text"
                          value={formData.instagram}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              instagram: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                          placeholder="@usuario"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="bio"
                        className="block text-sm font-semibold text-slate-700 mb-2"
                      >
                        Descripción (Opcional)
                      </label>
                      <textarea
                        id="bio"
                        rows={2}
                        value={formData.descripcion}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            descripcion: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                        placeholder="Breve bio..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-70"
                    >
                      {saving ? (
                        <Loader2 className="animate-spin w-5 h-5" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}{" "}
                      Guardar
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <div className="grid gap-4">
                {profesores.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">
                      No hay profesores aún
                    </h3>
                  </div>
                )}
                {profesores.map((prof) => (
                  <div
                    key={prof.id_profesor}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-all group"
                  >
                    <div className="relative w-16 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
                      {prof.foto_url ? (
                        <Image
                          src={prof.foto_url}
                          alt={prof.nombre}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg truncate">
                        {prof.nombre}
                      </h3>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {prof.telefono && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="w-3 h-3 text-green-600" />{" "}
                            {prof.telefono}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEdit(prof)}
                        className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(prof.id_profesor!)}
                        className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PREVIEW EN TIEMPO REAL */}
          <div className="xl:col-span-1 xl:sticky xl:top-6 hidden xl:block">
            <div className="bg-[#0b0d12] rounded-[2rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden h-[850px] flex flex-col relative">
              <div className="bg-slate-800 px-5 py-4 flex justify-center relative shrink-0">
                <div className="bg-slate-700 text-slate-300 text-xs font-medium px-4 py-1.5 rounded-full">
                  🔒 {subdominio}.versori.com/profesores
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0b0d12] to-[#0e1a2b] p-8">
                <h2 className="text-center text-3xl font-bold text-white mb-10">
                  » PROFESORES «
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  {(editingId
                    ? [
                        ...profesores.filter(
                          (p) => p.id_profesor !== editingId
                        ),
                        formData,
                      ]
                    : profesores
                  ).map((prof, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg shadow-lg border border-blue-900/40 bg-[#0e1a2b] flex items-center justify-center">
                        {prof.foto_url ? (
                          <Image
                            src={prof.foto_url}
                            alt={prof.nombre}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          // PREVIEW DE LA IMAGEN GENÉRICA
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                            <User className="w-20 h-20 opacity-30 mb-2" />
                            <span className="text-xs uppercase tracking-widest opacity-50 font-bold"></span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-white font-semibold text-lg mt-4">
                        {prof.nombre || "Nombre del Profesor"}
                      </h3>
                      <div className="flex flex-col items-center text-sm text-gray-400 mt-2 space-y-1">
                        {prof.telefono && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-green-400" />
                            <span>{prof.telefono}</span>
                          </div>
                        )}
                        {prof.instagram && (
                          <div className="flex items-center gap-2">
                            <Instagram className="w-4 h-4 text-pink-500" />
                            <span>{prof.instagram}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-slate-500 mt-4 font-medium">
              Vista previa en tiempo real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
