"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Save,
  Loader2,
  Smile,
  FileText,
  Users, // Icono para Género
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Definimos la interfaz estricta basada en tu DB
interface ProfileData {
  id_usuario: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  apodo?: string | null;
  bio?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
}

interface Props {
  initialData: ProfileData | null;
  email: string;
  userId: string;
}

export default function UserProfileForm({ initialData, email, userId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Estado para mensajes de feedback (reemplaza al alert)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState<ProfileData>(
    initialData || {
      id_usuario: userId,
      nombre: "",
      apellido: "",
      telefono: "",
      apodo: "",
      bio: "",
      fecha_nacimiento: "",
      genero: "",
    },
  );

  const handleChange = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error si el usuario empieza a escribir
    if (feedback?.type === "error") setFeedback(null);
  };

  const validateForm = () => {
    if (!formData.nombre?.trim() || !formData.apellido?.trim()) {
      setFeedback({
        type: "error",
        message: "El nombre y apellido son obligatorios.",
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setFeedback(null);

    if (!validateForm()) return;

    setSaving(true);
    try {
      // LLAMADA AL SERVIDOR (API ROUTE)
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          apodo: formData.apodo,
          bio: formData.bio,
          fecha_nacimiento: formData.fecha_nacimiento || null, // Enviar null si está vacío
          genero: formData.genero,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar");
      }

      setFeedback({
        type: "success",
        message: "¡Perfil actualizado correctamente!",
      });
      router.refresh();

      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setFeedback(null), 3000);
    } catch (error: any) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error.message || "Ocurrió un error al guardar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#111318] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
      {/* Feedback Message Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 border animate-in fade-in slide-in-from-top-2 ${
            feedback.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <p className="font-medium text-sm">{feedback.message}</p>
        </div>
      )}

      {/* SECCIÓN 1: IDENTIDAD */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <User className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-white">Información Personal</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div className="space-y-2">
            <label
              htmlFor="nombre"
              className="text-sm font-medium text-gray-400"
            >
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={formData.nombre || ""}
              onChange={(e) => handleChange("nombre", e.target.value)}
              className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
              placeholder="Ej: Juan"
            />
          </div>

          {/* Apellido */}
          <div className="space-y-2">
            <label
              htmlFor="apellido"
              className="text-sm font-medium text-gray-400"
            >
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              id="apellido"
              type="text"
              value={formData.apellido || ""}
              onChange={(e) => handleChange("apellido", e.target.value)}
              className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
              placeholder="Ej: Pérez"
            />
          </div>

          {/* Fecha Nacimiento */}
          <div className="space-y-2">
            <label
              htmlFor="fecha_nacimiento"
              className="text-sm font-medium text-gray-400 flex items-center gap-2"
            >
              <Calendar className="w-3 h-3" /> Fecha de Nacimiento
            </label>
            <input
              id="fecha_nacimiento"
              type="date"
              value={formData.fecha_nacimiento || ""}
              onChange={(e) => handleChange("fecha_nacimiento", e.target.value)}
              // [color-scheme:dark] fuerza al navegador a renderizar el calendario en oscuro
              className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Género */}
          <div className="space-y-2">
            <label
              htmlFor="genero"
              className="text-sm font-medium text-gray-400 flex items-center gap-2"
            >
              <Users className="w-3 h-3" /> Género
            </label>
            <select
              id="genero"
              value={formData.genero || ""}
              onChange={(e) => handleChange("genero", e.target.value)}
              className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
            >
              <option value="" className="bg-[#0b0d12] text-gray-500">
                Seleccionar...
              </option>
              <option value="Masculino" className="bg-[#0b0d12]">
                Masculino
              </option>
              <option value="Femenino" className="bg-[#0b0d12]">
                Femenino
              </option>
              <option value="Otro" className="bg-[#0b0d12]">
                Otro
              </option>
              <option value="Prefiero no decirlo" className="bg-[#0b0d12]">
                Prefiero no decirlo
              </option>
            </select>
          </div>
        </div>

        {/* SECCIÓN 2: CONTACTO */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 pt-6">
          <Phone className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-bold text-white">Contacto</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email (Read Only) */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-400 flex items-center gap-2"
            >
              <Mail className="w-3 h-3" /> Email (No editable)
            </label>
            <input
              id="email"
              type="text"
              value={email}
              disabled
              className="w-full bg-[#1a1d24] border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed select-none"
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <label
              htmlFor="telefono"
              className="text-sm font-medium text-gray-400"
            >
              Teléfono / WhatsApp
            </label>
            <input
              id="telefono"
              type="tel"
              value={formData.telefono || ""}
              onChange={(e) => handleChange("telefono", e.target.value)}
              className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors placeholder:text-gray-600"
              placeholder="+54 9 11 ..."
            />
          </div>
        </div>

        {/* SECCIÓN 3: PERFIL DE JUGADOR */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 pt-6">
          <Smile className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold text-white">Perfil de Jugador</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Apodo */}
          <div className="space-y-2">
            <label
              htmlFor="apodo"
              className="text-sm font-medium text-gray-400"
            >
              Apodo / Nickname
            </label>
            <input
              id="apodo"
              type="text"
              value={formData.apodo || ""}
              onChange={(e) => handleChange("apodo", e.target.value)}
              className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
              placeholder="¿Cómo te dicen en la cancha?"
            />
          </div>

          {/* Bio */}
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label
              htmlFor="bio"
              className="text-sm font-medium text-gray-400 flex items-center gap-2"
            >
              <FileText className="w-3 h-3" /> Biografía Corta
            </label>
            <textarea
              id="bio"
              rows={3}
              value={formData.bio || ""}
              onChange={(e) => handleChange("bio", e.target.value)}
              className="w-full bg-[#0b0d12] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none placeholder:text-gray-600"
              placeholder="Tu nivel, lado preferido de la cancha, etc."
            />
          </div>
        </div>

        {/* BOTÓN GUARDAR */}
        <div className="flex justify-end pt-6 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
