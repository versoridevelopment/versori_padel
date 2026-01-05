"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Filter,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  XCircle,
  Edit2,
} from "lucide-react";

// Tipos
type EstadoReserva = "Activa" | "Finalizada" | "Cancelada";

type Reserva = {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  precioTotal: number;
  clienteId: number;
  cliente: string;
  telefono: string;
  cancha: string;
  estado: EstadoReserva;
  metodoPago: string;
  imagenCancha: string;
};

export default function ReservasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<EstadoReserva | "Todas">(
    "Todas"
  );

  // Mock Data
  const reservas: Reserva[] = [
    {
      id: 1,
      fechaInicio: "2025-10-19T10:00:00",
      fechaFin: "2025-10-19T11:30:00",
      precioTotal: 15000,
      clienteId: 1,
      cliente: "Neil Sims",
      telefono: "+54 379 4000001",
      cancha: "Cancha 1",
      estado: "Activa",
      metodoPago: "MercadoPago",
      imagenCancha: "/reserva/cancha_interior.jpg",
    },
    {
      id: 2,
      fechaInicio: "2025-10-18T15:00:00",
      fechaFin: "2025-10-18T16:00:00",
      precioTotal: 10000,
      clienteId: 3,
      cliente: "Thomas Lean",
      telefono: "+54 379 4000003",
      cancha: "Cancha 2",
      estado: "Finalizada",
      metodoPago: "Efectivo",
      imagenCancha: "/reserva/cancha_interior.jpg",
    },
    {
      id: 3,
      fechaInicio: "2025-10-17T19:00:00",
      fechaFin: "2025-10-17T20:30:00",
      precioTotal: 12000,
      clienteId: 2,
      cliente: "Roberta Casas",
      telefono: "+54 379 4000002",
      cancha: "Cancha 3",
      estado: "Cancelada",
      metodoPago: "Tarjeta",
      imagenCancha: "/reserva/cancha_interior.jpg",
    },
  ];

  // Helpers
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calcularDuracion = (inicio: string, fin: string) => {
    const diffMs = new Date(fin).getTime() - new Date(inicio).getTime();
    const minutos = Math.floor(diffMs / 60000);
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas > 0 ? `${horas}h` : ""}${mins > 0 ? ` ${mins}m` : ""}`;
  };

  // Filtrado simple (Frontend)
  const filteredReservas = reservas.filter((r) => {
    const matchesSearch =
      r.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cancha.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterEstado === "Todas" || r.estado === filterEstado;
    return matchesSearch && matchesStatus;
  });

  return (
    // Contenedor principal con fondo gris claro para mejorar la visibilidad
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6">
        {/* Header y Acciones Principales */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Reservas
            </h1>
            <p className="text-sm text-gray-500">
              Administra y supervisa la ocupación de las canchas.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Exportar Reporte
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="search"
                id="search-reservas"
                aria-label="Buscar reservas por cliente o cancha"
                placeholder="Buscar cliente o cancha..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro Estado */}
            <div className="relative">
              <select
                name="estado"
                id="filtro-estado"
                aria-label="Filtrar por estado de la reserva"
                title="Filtrar por estado"
                className="appearance-none w-full sm:w-40 pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as any)}
              >
                <option value="Todas">Todos los estados</option>
                <option value="Activa">Activas</option>
                <option value="Finalizada">Finalizadas</option>
                <option value="Cancelada">Canceladas</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            {/* Filtro Fecha (Visual) */}
            <button
              aria-label="Seleccionar rango de fechas"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white"
            >
              <Calendar className="w-4 h-4" />
              <span>Esta semana</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Cancha</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Horario</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReservas.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    {/* Columna Cancha */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                          <div className="absolute inset-0 bg-gray-200" />
                          <Image
                            src={r.imagenCancha}
                            alt={`Foto de ${r.cancha}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {r.cancha}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.metodoPago}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Columna Cliente */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/usuarios/${r.clienteId}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        aria-label={`Ver perfil de ${r.cliente}`}
                      >
                        {r.cliente}
                      </Link>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        {r.telefono}
                      </p>
                    </td>

                    {/* Columna Horario */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm">
                        <span className="text-gray-900 font-medium">
                          {new Date(r.fechaInicio).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {new Date(r.fechaInicio).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -
                          {new Date(r.fechaFin).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          ⏱ {calcularDuracion(r.fechaInicio, r.fechaFin)}
                        </span>
                      </div>
                    </td>

                    {/* Columna Estado */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          r.estado === "Activa"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.estado === "Finalizada"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            r.estado === "Activa"
                              ? "bg-emerald-500"
                              : r.estado === "Finalizada"
                              ? "bg-blue-500"
                              : "bg-red-500"
                          }`}
                        ></span>
                        {r.estado}
                      </span>
                    </td>

                    {/* Columna Precio */}
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-gray-900 text-sm">
                        ${r.precioTotal.toLocaleString("es-AR")}
                      </span>
                    </td>

                    {/* Columna Acciones */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title="Ver detalles"
                          aria-label="Ver detalles de la reserva"
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          aria-label="Editar reserva"
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {r.estado === "Activa" && (
                          <button
                            type="button"
                            title="Cancelar reserva"
                            aria-label="Cancelar reserva"
                            className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">
              Mostrando 1-3 de 3 resultados
            </span>
            <div className="flex gap-2">
              <button
                disabled
                aria-label="Página anterior"
                title="Página anterior"
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 text-gray-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled
                aria-label="Página siguiente"
                title="Página siguiente"
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 text-gray-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
