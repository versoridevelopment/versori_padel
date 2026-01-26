"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/utils/canvasUtils";
import {
  ArrowLeft,
  Save,
  Loader2,
  DollarSign,
  Type,
  AlignLeft,
  UploadCloud,
  CheckCircle2,
  Trophy,
  Sun,
  Umbrella,
  ImageIcon,
  Power,
  Trash2,
  ZoomIn,
} from "lucide-react";

type ApiError = { error: string };

type Tarifario = {
  id_tarifario: number;
  nombre: string;
  activo: boolean;
};

type Cancha = {
  id_cancha: number;
  id_club: number;
  nombre: string;
  descripcion: string | null;
  precio_hora: number;
  imagen_url: string | null;
  es_exterior: boolean;
  activa: boolean;
  estado: boolean;
  id_tarifario: number | null;
};

// --- COMPONENTE PREVIEW ---
function PreviewCard({
  nombre,
  descripcion,
  precio,
  imgPreview,
  imgCurrent,
  esExterior,
  activa,
  estado,
}: {
  nombre: string;
  descripcion: string;
  precio: string | number;
  imgPreview: string | null;
  imgCurrent: string | null;
  esExterior: boolean;
  activa: boolean;
  estado: boolean;
}) {
  // Lógica de imagen: Prioridad Nueva > Actual > Placeholder
  const displayImage = imgPreview || imgCurrent;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm sticky top-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          Vista Previa
        </h3>
        {!estado && (
          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
            DADA DE BAJA
          </span>
        )}
      </div>

      <div className="p-5">
        <div
          className={`flex gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm ${
            !estado ? "opacity-50 grayscale" : ""
          }`}
        >
          {/* Imagen */}
          <div className="relative w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100">
            {displayImage ? (
              <Image
                src={displayImage}
                alt="Preview"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-medium">Sin foto</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-lg font-bold text-slate-900 truncate">
                {nombre || "Nombre de la Cancha"}
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activa
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {activa ? "Operativa" : "Mantenimiento"}
              </span>
            </div>

            <p className="text-sm text-slate-500 line-clamp-1 mb-2">
              {descripcion || "Descripción breve..."}
            </p>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                  {esExterior ? (
                    <Sun className="w-3 h-3" />
                  ) : (
                    <Umbrella className="w-3 h-3" />
                  )}
                  {esExterior ? "Exterior" : "Techada"}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900">
                  ${precio ? Number(precio).toLocaleString("es-AR") : "0"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- CLIENTE PRINCIPAL ---
export default function EditarCanchaClient({
  clubId,
  clubNombre,
  idCancha,
}: {
  clubId: number;
  clubNombre: string;
  idCancha: number;
}) {
  const router = useRouter();

  // Estados de carga y datos
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [tarifarios, setTarifarios] = useState<Tarifario[]>([]);

  // Estados Cropper
  const [file, setFile] = useState<File | null>(null); // Archivo final
  const [tempImgSrc, setTempImgSrc] = useState<string | null>(null); // Imagen base para recortar
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Preview de la imagen NUEVA (recortada)
  const imgPreview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  // --- DATA FETCHING ---
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/canchas/${idCancha}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(err?.error || "No se pudo cargar la cancha");
      }
      const data = (await res.json()) as Cancha;

      // Seguridad básica frontend
      if (data.id_club !== clubId)
        throw new Error("Acceso denegado a esta cancha.");

      // Sanitización de datos
      const safe: Cancha = {
        ...data,
        id_tarifario: (data as any).id_tarifario ?? null,
      };

      setCancha(safe);
      setFile(null); // Resetear archivo nuevo al recargar
    } catch (err: any) {
      alert(err?.message || "Error al cargar cancha");
      router.push("/admin/personalizacion/canchas");
    } finally {
      setLoading(false);
    }
  }

  async function loadTarifarios() {
    try {
      const res = await fetch(`/api/admin/tarifarios?id_club=${clubId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = await res.json();
      const items = (payload?.tarifarios ?? []) as any[];
      setTarifarios(
        items
          .filter((t) => t.activo === true)
          .map((t) => ({
            id_tarifario: t.id_tarifario,
            nombre: t.nombre,
            activo: t.activo,
          }))
      );
    } catch {}
  }

  useEffect(() => {
    load();
    loadTarifarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCancha]);

  // --- HANDLERS CROPPER ---
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setTempImgSrc(reader.result as string);
        setIsCropping(true);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      };
      reader.readAsDataURL(selectedFile);
      e.target.value = "";
    }
  };

  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const onCropSave = async () => {
    try {
      if (!tempImgSrc || !croppedAreaPixels) return;
      const croppedBlob = await getCroppedImg(tempImgSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "cancha_updated.jpg", {
        type: "image/jpeg",
      });
      setFile(croppedFile);
      setIsCropping(false);
      setTempImgSrc(null);
    } catch {
      alert("Error al recortar");
    }
  };

  // --- HANDLERS GUARDADO ---
  const canSubmit = useMemo(() => {
    if (!cancha) return false;
    return (
      cancha.nombre.trim().length > 0 &&
      String(cancha.precio_hora).trim().length > 0 &&
      !Number.isNaN(Number(cancha.precio_hora))
    );
  }, [cancha]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!cancha || !canSubmit || isSaving) return;

    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("nombre", cancha.nombre);
      fd.append("descripcion", cancha.descripcion ?? "");
      fd.append("precio_hora", String(cancha.precio_hora));
      fd.append("es_exterior", String(cancha.es_exterior));
      fd.append("activa", String(cancha.activa));
      fd.append("estado", String(cancha.estado));
      fd.append(
        "id_tarifario",
        cancha.id_tarifario === null ? "" : String(cancha.id_tarifario)
      );

      if (file) fd.append("imagen", file);

      const res = await fetch(`/api/admin/canchas/${idCancha}`, {
        method: "PATCH",
        body: fd,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(err?.error || "Error al guardar");
      }

      await load(); // Recargar datos frescos
      alert("Cambios guardados exitosamente.");
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  // --- ACCIONES HEADER ---
  async function onToggleEstado(nuevoEstado: boolean) {
    if (!nuevoEstado && !confirm("¿Dar de baja esta cancha? (Baja lógica)"))
      return;

    try {
      // Usamos el endpoint adecuado según la acción para coherencia
      const method = nuevoEstado ? "PATCH" : "DELETE";
      const body = nuevoEstado ? JSON.stringify({ estado: true }) : undefined;
      const headers = nuevoEstado
        ? { "Content-Type": "application/json" }
        : undefined;

      const res = await fetch(`/api/admin/canchas/${idCancha}`, {
        method,
        headers,
        body,
      });

      if (!res.ok) throw new Error("Error al cambiar estado");
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading || !cancha) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 -m-6 md:-m-10 relative">
      {/* MODAL CROPPER */}
      {isCropping && tempImgSrc && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl h-[60vh] bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            <Cropper
              image={tempImgSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="mt-6 flex flex-col items-center w-full max-w-md gap-4">
            <div className="flex items-center gap-4 bg-gray-800 p-3 rounded-xl border border-gray-700 w-full">
              <ZoomIn className="text-gray-400 w-5 h-5" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div className="flex gap-4 w-full">
              <button
                type="button"
                onClick={() => {
                  setIsCropping(false);
                  setTempImgSrc(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onCropSave}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold shadow-lg"
              >
                Recortar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8 pb-32">
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
              <Link
                href="/admin/personalizacion/canchas"
                className="hover:text-blue-600 transition-colors"
              >
                Canchas
              </Link>
              <span>/</span>
              <span className="text-slate-900">Editar</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              {cancha.nombre}
              {!cancha.estado && (
                <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">
                  Inactiva
                </span>
              )}
            </h1>
            <p className="text-slate-500 mt-1 text-lg">
              Editando detalles de la cancha #{cancha.id_cancha}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/personalizacion/canchas"
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </Link>

            {/* Botón de Baja/Alta Lógica */}
            {cancha.estado ? (
              <button
                onClick={() => onToggleEstado(false)}
                className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Dar de Baja
              </button>
            ) : (
              <button
                onClick={() => onToggleEstado(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-bold hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-2"
              >
                <Power className="w-4 h-4" /> Reactivar
              </button>
            )}

            <button
              onClick={onSave}
              disabled={!canSubmit || isSaving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* --- FORMULARIO (2/3) --- */}
          <div className="lg:col-span-2 space-y-6">
            <form className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Info Básica */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Type className="w-5 h-5 text-blue-500" /> Información Básica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Nombre
                    </label>
                    <input
                      value={cancha.nombre}
                      onChange={(e) =>
                        setCancha({ ...cancha, nombre: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Descripción{" "}
                      <span className="text-slate-400 font-normal">
                        (Opcional)
                      </span>
                    </label>
                    <div className="relative">
                      <AlignLeft className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        value={cancha.descripcion ?? ""}
                        onChange={(e) =>
                          setCancha({ ...cancha, descripcion: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Configuración */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-500" /> Detalles & Precio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Precio */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Precio por Hora Desde
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        value={String(cancha.precio_hora)}
                        onChange={(e) =>
                          setCancha({
                            ...cancha,
                            precio_hora: Number(
                              e.target.value.replace(/[^\d]/g, "")
                            ),
                          })
                        }
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-medium text-lg"
                      />
                    </div>
                  </div>

                  {/* Tarifario */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Tarifario
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      value={cancha.id_tarifario ?? ""}
                      onChange={(e) =>
                        setCancha({
                          ...cancha,
                          id_tarifario:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    >
                      <option value="">(Default del tipo de cancha)</option>
                      {tarifarios.map((t) => (
                        <option key={t.id_tarifario} value={t.id_tarifario}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggles Visuales */}
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 pt-2">
                    {/* Toggle Exterior */}
                    <label
                      className={`flex-1 flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        cancha.es_exterior
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            cancha.es_exterior
                              ? "bg-blue-100 text-blue-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {cancha.es_exterior ? (
                            <Sun className="w-5 h-5" />
                          ) : (
                            <Umbrella className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <span className="block font-bold text-slate-700">
                            Ubicación
                          </span>
                          <span className="text-xs text-slate-500">
                            {cancha.es_exterior
                              ? "Al aire libre"
                              : "Cancha Techada"}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={cancha.es_exterior}
                        onChange={(e) =>
                          setCancha({
                            ...cancha,
                            es_exterior: e.target.checked,
                          })
                        }
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          cancha.es_exterior
                            ? "border-blue-500 bg-blue-500"
                            : "border-slate-300"
                        }`}
                      >
                        {cancha.es_exterior && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </label>

                    {/* Toggle Activa (Operativa) */}
                    <label
                      className={`flex-1 flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        cancha.activa
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            cancha.activa
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-700">
                            Operativa
                          </span>
                          <span className="text-xs text-slate-500">
                            {cancha.activa
                              ? "Disponible reservas"
                              : "En mantenimiento"}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={cancha.activa}
                        onChange={(e) =>
                          setCancha({ ...cancha, activa: e.target.checked })
                        }
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          cancha.activa
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300"
                        }`}
                      >
                        {cancha.activa && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Sección Imagen */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-500" /> Imagen de
                  Portada
                </h3>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all group overflow-hidden relative">
                  {file ? (
                    <div className="flex flex-col items-center text-emerald-600">
                      <CheckCircle2 className="w-10 h-10 mb-2" />
                      <p className="font-bold text-sm">
                        Nueva imagen recortada lista
                      </p>
                      <p className="text-xs text-slate-400">
                        Clic para cambiar
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                      <p className="text-sm text-slate-500 group-hover:text-blue-600">
                        <span className="font-semibold">
                          Haz clic para subir
                        </span>{" "}
                        o arrastra
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        JPG, PNG (Recorte 16:9 automático)
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={onFileChange}
                  />
                </label>
              </div>
            </form>
          </div>

          {/* --- PREVIEW (1/3) --- */}
          <div className="lg:col-span-1">
            <PreviewCard
              nombre={cancha.nombre}
              descripcion={cancha.descripcion ?? ""}
              precio={cancha.precio_hora}
              imgPreview={imgPreview}
              imgCurrent={cancha.imagen_url}
              esExterior={cancha.es_exterior}
              activa={cancha.activa}
              estado={cancha.estado}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
