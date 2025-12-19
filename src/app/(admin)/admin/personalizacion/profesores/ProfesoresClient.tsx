"use client";

import { useState } from "react";
import Image from "next/image";
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
} from "lucide-react";
import { buildStaffPath, PUBLIC_MEDIA_BUCKET } from "@/lib/storage/paths";

// Tipo sincronizado con tu DB y componente público
type Profesor = {
  id_profesor?: number;
  nombre: string;
  telefono: string;
  instagram: string;
  foto_url: string;
  descripcion?: string; // Opcional, aunque no se use en la card pública actual, es bueno tenerlo en DB
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormData((prev) => ({ ...prev, foto_url: URL.createObjectURL(file) }));
    }
  };

  const handleSave = async () => {
    if (!formData.nombre) return alert("El nombre es obligatorio");
    setSaving(true);

    try {
      let finalUrl = formData.foto_url;

      // 1. Subir imagen si hay nueva
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

      // 2. Preparar payload
      const payload = {
        nombre: formData.nombre,
        telefono: formData.telefono,
        instagram: formData.instagram,
        descripcion: formData.descripcion, // Lo guardamos aunque no se muestre en grid
        foto_url: finalUrl,
        id_club: clubId,
      };

      // 3. Insertar o Actualizar
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
    } catch (err) {
      console.error(err);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 -m-6 md:-m-10">
      <div className="max-w-[1600px] mx-auto space-y-8 pb-32">
        {/* HEADER */}
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
          {/* COLUMNA IZQUIERDA: LISTA O EDITOR */}
          <div className="space-y-6">
            {/* --- MODO EDICIÓN --- */}
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
                    aria-label="Cerrar formulario"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Foto */}
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-28 bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200 flex-shrink-0 shadow-sm">
                      {formData.foto_url ? (
                        <Image
                          src={formData.foto_url}
                          alt="Avatar"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <div>
                      <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors flex gap-2 items-center mb-2">
                        <UploadCloud className="w-5 h-5" /> Subir Foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                      </label>
                      <p className="text-xs text-slate-400">
                        Recomendado: Formato vertical o cuadrado.
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
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
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
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
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="@usuario"
                        />
                      </div>
                    </div>

                    {/* Descripción opcional (oculta en DB pero útil si cambias el diseño) */}
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="Breve bio del profesor..."
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-70 transition-transform active:scale-95"
                    >
                      {saving ? (
                        <Loader2 className="animate-spin w-5 h-5" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      Guardar
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              /* --- MODO LISTA --- */
              <div className="grid gap-4">
                {profesores.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">
                      No hay profesores aún
                    </h3>
                    <p className="text-slate-500">
                      Agrega el primero para que aparezca en la web.
                    </p>
                  </div>
                )}
                {profesores.map((prof) => (
                  <div
                    key={prof.id_profesor}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md hover:border-blue-200 transition-all group"
                  >
                    <div className="relative w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      {prof.foto_url ? (
                        <Image
                          src={prof.foto_url}
                          alt={prof.nombre}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          Sin foto
                        </div>
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
                        {prof.instagram && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Instagram className="w-3 h-3 text-pink-500" />{" "}
                            {prof.instagram}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEdit(prof)}
                        className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Editar profesor"
                        aria-label="Editar profesor"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(prof.id_profesor!)}
                        className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="Eliminar profesor"
                        aria-label="Eliminar profesor"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: PREVIEW (Idéntico a tu ProfesorCard público) */}
          <div className="xl:col-span-1 xl:sticky xl:top-6">
            <div className="bg-[#0b0d12] rounded-[2rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden h-[850px] flex flex-col relative">
              {/* Browser Bar */}
              <div className="bg-slate-800 px-5 py-4 flex justify-center relative shrink-0">
                <div className="bg-slate-700 text-slate-300 text-xs font-medium px-4 py-1.5 rounded-full">
                  🔒 {subdominio}.versori.com/profesores
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0b0d12] to-[#0e1a2b] p-8">
                <h2 className="text-center text-3xl font-bold text-white mb-10">
                  » PROFESORES «
                </h2>

                {/* Grid Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  {/* Lógica de renderizado:
                           Si estamos editando, mostramos la lista SIN el que se edita, + el formulario actual (preview en tiempo real).
                           Si no, mostramos la lista tal cual.
                        */}
                  {(editingId
                    ? [
                        ...profesores.filter(
                          (p) => p.id_profesor !== editingId
                        ),
                        formData,
                      ]
                    : profesores
                  ).map((prof, idx) => (
                    // ESTE ES TU COMPONENTE PUBLICO 'ProfesorCard' SIMULADO
                    <div
                      key={idx}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg shadow-lg border border-blue-900/40 bg-[#0e1a2b]">
                        {prof.foto_url ? (
                          <Image
                            src={prof.foto_url}
                            alt={prof.nombre}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                            Sin Foto
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
