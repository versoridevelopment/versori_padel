"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop"; // Importamos el cropper
import { getCroppedImg } from "@/lib/utils/canvasUtils"; // Tu utilidad existente
import {
  ArrowLeft,
  Save,
  Loader2,
  DollarSign,
  Type,
  AlignLeft,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Trophy,
  Sun,
  Umbrella,
  ImageIcon,
  ZoomIn, // Icono para el zoom
  X, // Icono cerrar
} from "lucide-react";

type ApiError = { error: string };

// --- COMPONENTE PREVIEW (Sin cambios) ---
function PreviewCard({
  nombre,
  descripcion,
  precio,
  imgPreview,
  esExterior,
  activa,
}: {
  nombre: string;
  descripcion: string;
  precio: string;
  imgPreview: string | null;
  esExterior: boolean;
  activa: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm sticky top-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          Vista Previa
        </h3>
      </div>

      <div className="p-5">
        <div className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="relative w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100">
            {imgPreview ? (
              <Image
                src={imgPreview}
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
                {activa ? "Activa" : "Inactiva"}
              </span>
            </div>

            <p className="text-sm text-slate-500 line-clamp-1 mb-2">
              {descripcion || "Descripción breve de la cancha..."}
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

        <p className="text-center text-xs text-slate-400 mt-4">
          Así se verá la tarjeta en el listado de administración.
        </p>
      </div>
    </div>
  );
}

// --- CLIENTE PRINCIPAL ---
export default function NuevaCanchaClient({
  clubId,
  clubNombre,
}: {
  clubId: number;
  clubNombre: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [idTipoCancha, setIdTipoCancha] = useState("1");
  const [esExterior, setEsExterior] = useState(true);
  const [activa, setActiva] = useState(true);

  // --- ESTADOS CROPPER ---
  const [file, setFile] = useState<File | null>(null); // Archivo final recortado
  const [tempImgSrc, setTempImgSrc] = useState<string | null>(null); // Imagen original para recortar
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Preview de la imagen final (blob recortado)
  const imgPreview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  const canSubmit = useMemo(() => {
    return (
      nombre.trim().length > 0 &&
      precio.trim().length > 0 &&
      !Number.isNaN(Number(precio)) &&
      Number(precio) > 0 &&
      idTipoCancha.trim().length > 0
    );
  }, [nombre, precio, idTipoCancha]);

  // --- HANDLERS DEL CROPPER ---

  // 1. Al seleccionar archivo, abrimos el modal
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
      e.target.value = ""; // Limpiar input para permitir re-selección
    }
  };

  // 2. Al completar el movimiento de recorte
  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // 3. Al guardar el recorte -> Generamos el Blob final
  const onCropSave = async () => {
    try {
      if (!tempImgSrc || !croppedAreaPixels) return;
      const croppedBlob = await getCroppedImg(tempImgSrc, croppedAreaPixels);

      // Convertimos el blob en un File para mantener compatibilidad con la subida
      const croppedFile = new File([croppedBlob], "cancha_cropped.jpg", {
        type: "image/jpeg",
      });

      setFile(croppedFile); // Guardamos el archivo final
      setIsCropping(false); // Cerramos modal
      setTempImgSrc(null); // Limpiamos temporal
    } catch (e) {
      console.error(e);
      alert("Error al recortar la imagen");
    }
  };

  const onCropCancel = () => {
    setIsCropping(false);
    setTempImgSrc(null);
  };

  // --- GUARDADO ---
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isSaving) return;

    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("id_club", String(clubId));
      fd.append("id_tipo_cancha", String(idTipoCancha));
      fd.append("nombre", nombre);
      fd.append("descripcion", descripcion);
      fd.append("precio_hora", precio);
      fd.append("es_exterior", String(esExterior));
      fd.append("activa", String(activa));

      // Si hay archivo recortado, lo enviamos
      if (file) fd.append("imagen", file);

      const res = await fetch("/api/admin/canchas", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ApiError | null;
        throw new Error(err?.error || "No se pudo crear la cancha");
      }

      router.push("/admin/personalizacion/canchas");
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 -m-6 md:-m-10 relative">
      {/* --- MODAL DE RECORTE (Igual que en Profesores) --- */}
      {isCropping && tempImgSrc && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl h-[60vh] bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            <Cropper
              image={tempImgSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9} // ASPECTO 16:9 PARA CANCHAS
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          <div className="mt-6 flex flex-col items-center w-full max-w-md gap-4">
            {/* Control de Zoom */}
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

            {/* Botones */}
            <div className="flex gap-4 w-full">
              <button
                type="button"
                onClick={onCropCancel}
                className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onCropSave}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold shadow-lg shadow-blue-900/20"
              >
                Recortar y Usar
              </button>
            </div>
            <p className="text-gray-500 text-xs">Formato panorámico (16:9)</p>
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
              <span className="text-slate-900">Nueva</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              Crear Nueva Cancha
            </h1>
            <p className="text-slate-500 mt-1 text-lg">
              Agrega un nuevo espacio deportivo a{" "}
              <span className="font-semibold text-slate-700">{clubNombre}</span>
              .
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/personalizacion/canchas"
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Cancelar
            </Link>
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
              {isSaving ? "Guardando..." : "Crear Cancha"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* --- FORMULARIO (2/3 ancho) --- */}
          <div className="lg:col-span-2 space-y-6">
            <form className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Sección Principal */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Type className="w-5 h-5 text-blue-500" /> Información Básica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Nombre de la Cancha
                    </label>
                    <input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Cancha Central, Pista 1..."
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
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        placeholder="Ej: Césped sintético premium, techada..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Sección Configuración */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-500" /> Detalles & Precio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Precio */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Precio por Hora
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        value={precio}
                        onChange={(e) =>
                          setPrecio(e.target.value.replace(/[^\d]/g, ""))
                        }
                        placeholder="0"
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono font-medium text-lg"
                      />
                    </div>
                  </div>

                  {/* Tipo (ID Placeholder) */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Tipo de Cancha ID
                    </label>
                    <input
                      value={idTipoCancha}
                      onChange={(e) =>
                        setIdTipoCancha(e.target.value.replace(/[^\d]/g, ""))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 pt-2">
                    {/* Toggle Exterior */}
                    <label
                      className={`flex-1 flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        esExterior
                          ? "border-blue-200 bg-blue-50/50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            esExterior
                              ? "bg-blue-100 text-blue-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {esExterior ? (
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
                            {esExterior ? "Al aire libre" : "Cancha Techada"}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={esExterior}
                        onChange={(e) => setEsExterior(e.target.checked)}
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          esExterior
                            ? "border-blue-500 bg-blue-500"
                            : "border-slate-300"
                        }`}
                      >
                        {esExterior && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </label>

                    {/* Toggle Activa */}
                    <label
                      className={`flex-1 flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        activa
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            activa
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-700">
                            Estado
                          </span>
                          <span className="text-xs text-slate-500">
                            {activa
                              ? "Disponible para reservas"
                              : "Fuera de servicio"}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={activa}
                        onChange={(e) => setActiva(e.target.checked)}
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          activa
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300"
                        }`}
                      >
                        {activa && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Sección Imagen CON CROPPER TRIGGER */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-500" /> Imagen de
                  Portada
                </h3>

                {/* Zona de "Drop" / Input */}
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all group relative overflow-hidden">
                  {file ? (
                    // Si ya hay un archivo recortado, mostramos una mini preview o un indicador de éxito
                    <div className="flex flex-col items-center text-emerald-600">
                      <CheckCircle2 className="w-10 h-10 mb-2" />
                      <p className="font-bold text-sm">
                        Imagen lista para subir
                      </p>
                      <p className="text-xs text-slate-400">
                        Haz clic para cambiar
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
                        JPG, PNG (Recorte automático 16:9)
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

          {/* --- PREVIEW STICKY (1/3 ancho) --- */}
          <div className="lg:col-span-1">
            <PreviewCard
              nombre={nombre}
              descripcion={descripcion}
              precio={precio}
              imgPreview={imgPreview}
              esExterior={esExterior}
              activa={activa}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
