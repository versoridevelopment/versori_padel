"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Building2,
  MapPin,
  Users2,
  Trophy,
  Home, // Icono para el Quincho
  Tag, // Icono para Tarifarios
} from "lucide-react";
import { ROLE_PERMISSIONS, Rol } from "@/lib/roles";

export function Sidebar() {
  // En producción, esto vendría de un Contexto de Auth o Hook de Supabase
  const [userRole] = useState<Rol>("Administrador");
  // const permisos = ROLE_PERMISSIONS[userRole];

  const [isPersonalizacionOpen, setIsPersonalizacionOpen] = useState(true);

  const user = {
    nombreCompleto: "Juan Cruz",
    rol: "Administrador",
    fotoPerfil: "/placeholder-avatar.png",
  };

  // Enlaces principales
  const links = [
    {
      key: "dashboard",
      href: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      key: "reservas",
      href: "/admin/reservas",
      label: "Reservas",
      icon: <Calendar size={18} />,
    },
    {
      key: "usuarios",
      href: "/admin/usuarios",
      label: "Usuarios",
      icon: <Users size={18} />,
    },
    {
      key: "pagos",
      href: "/admin/pagos",
      label: "Pagos",
      icon: <CreditCard size={18} />,
    },
  ];

  // Submenú de Personalización
  const personalizacionLinks = [
    {
      href: "/admin/personalizacion/club",
      label: "Página Principal", // Contiene Identidad, Nosotros y Contacto unificados
      icon: <Building2 size={14} />,
    },
    {
      href: "/admin/personalizacion/profesores", // CORREGIDO: Ruta original restaurada
      label: "Equipo / Profesores",
      icon: <Users2 size={14} />,
    },
    {
      href: "/admin/quinchos", // Nueva página de Quinchos
      label: "Quincho / Eventos",
      icon: <Home size={14} />,
    },
    {
      href: "/admin/personalizacion/canchas",
      label: "Gestión de Canchas",
      icon: <Trophy size={14} />,
    },
    {
      href: "/admin/personalizacion/tarifarios",
      label: "Tarifarios",
      icon: <Tag size={14} />,
    },
  ];

  const handleLogout = () => {
    alert("Sesión cerrada");
  };

  return (
    <aside className="w-64 bg-[#0d1b2a] text-white flex flex-col justify-between shadow-lg h-screen sticky top-0 overflow-hidden">
      {/* --- SECCIÓN USUARIO --- */}
      <div className="flex flex-col items-center p-6 border-b border-gray-800 bg-[#0b1623]">
        <Link href="/admin/usuario" className="group relative">
          <div className="relative w-16 h-16 mx-auto transition-transform duration-300 group-hover:scale-105">
            <Image
              src={user.fotoPerfil}
              alt="Perfil"
              width={64}
              height={64}
              className="rounded-full border-2 border-blue-500/30 object-cover bg-gray-800 shadow-md"
              priority
            />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0b1623] rounded-full"></div>
          </div>
        </Link>
        <h2 className="mt-3 text-sm font-semibold tracking-wide text-gray-100">
          {user.nombreCompleto}
        </h2>
        <span className="px-2 py-0.5 mt-1 text-[10px] uppercase font-bold tracking-wider bg-blue-900/40 text-blue-300 rounded-full border border-blue-800/50">
          {user.rol}
        </span>
      </div>

      {/* --- NAVEGACIÓN PRINCIPAL --- */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {links.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-[#1b263b] rounded-lg transition-all duration-200 group font-medium text-sm"
          >
            <span className="group-hover:text-blue-400 transition-colors">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </Link>
        ))}

        {/* --- MENÚ DESPLEGABLE PERSONALIZACIÓN --- */}
        {userRole === "Administrador" && (
          <div className="pt-2 mt-2 border-t border-gray-800/50">
            <button
              onClick={() => setIsPersonalizacionOpen(!isPersonalizacionOpen)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                isPersonalizacionOpen
                  ? "bg-[#1b263b] text-white"
                  : "text-gray-400 hover:bg-[#1b263b] hover:text-white"
              }`}
            >
              <Settings
                size={18}
                className={isPersonalizacionOpen ? "text-blue-400" : ""}
              />
              <span className="font-medium flex-1 text-left">
                Personalización
              </span>
              {isPersonalizacionOpen ? (
                <ChevronDown size={14} className="text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )}
            </button>

            {/* Submenú */}
            {isPersonalizacionOpen && (
              <div className="mt-1 ml-3 space-y-0.5 border-l border-gray-700 pl-3">
                {personalizacionLinks.map((subLink) => (
                  <Link
                    key={subLink.href}
                    href={subLink.href}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-[#1b263b]/50 rounded-md transition-all duration-200"
                  >
                    <span className="opacity-70 text-blue-300">
                      {subLink.icon}
                    </span>
                    {subLink.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* --- LOGOUT --- */}
      <div className="p-3 border-t border-gray-800 bg-[#0b1623]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-lg transition-all duration-200 border border-transparent hover:border-red-900/30"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
