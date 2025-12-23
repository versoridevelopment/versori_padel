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
  Building2, // Icono para Nosotros/Club
  MapPin, // Icono para Contacto
  Users2, // Icono para Profesores
  Trophy, // Icono opcional para Canchas
} from "lucide-react";
import { ROLE_PERMISSIONS, Rol } from "@/lib/roles";

export function Sidebar() {
  // En producción, esto vendría de un Contexto de Auth o Hook de Supabase
  const [userRole] = useState<Rol>("Administrador");
  const permisos = ROLE_PERMISSIONS[userRole];

  // Control del desplegable de personalización
  const [isPersonalizacionOpen, setIsPersonalizacionOpen] = useState(false);

  // Mock user data
  const user = {
    nombreCompleto: "Juan Cruz",
    rol: "Administrador",
    fotoPerfil: "https://thispersondoesnotexist.com/", // Ojo: esta URL suele fallar a veces, considera un placeholder local
  };

  // Enlaces principales del Dashboard
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

  // Submenú de Personalización (Mapeado a las nuevas tablas de la DB)
  const personalizacionLinks = [
    {
      href: "/admin/personalizacion/club",
      label: "Página Principal",
      icon: <Settings size={14} />,
    },
    {
      href: "/admin/personalizacion/nosotros",
      label: "Sobre Nosotros",
      icon: <Building2 size={14} />,
    },
    {
      href: "/admin/personalizacion/profesores",
      label: "Equipo / Profesores",
      icon: <Users2 size={14} />,
    },
    {
      href: "/admin/personalizacion/canchas",
      label: "Gestión de Canchas",
      icon: <Trophy size={14} />,
    },
    {
      href: "/admin/personalizacion/contacto",
      label: "Contacto y Ubicación",
      icon: <MapPin size={14} />,
    },
  ];

  const handleLogout = () => alert("Sesión cerrada");

  return (
    <aside className="w-64 bg-[#0d1b2a] text-white flex flex-col justify-between shadow-lg h-screen sticky top-0">
      {/* --- SECCIÓN USUARIO --- */}
      <div className="flex flex-col items-center p-5 border-b border-gray-700 bg-[#0b1623]">
        <Link href="/admin/usuario" className="group relative">
          <div className="relative w-16 h-16 mx-auto transition-transform group-hover:scale-105">
            {/* Usamos un div como fallback si no hay imagen, o el componente Image */}
            <Image
              src="/placeholder-avatar.png" // Reemplaza con tu asset local o user.fotoPerfil
              alt="Perfil"
              width={64}
              height={64}
              className="rounded-full border-2 border-blue-500/50 object-cover bg-gray-800"
            />
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0d1b2a] rounded-full"></div>
        </Link>
        <h2 className="mt-3 text-lg font-semibold tracking-wide text-gray-100">
          {user.nombreCompleto}
        </h2>
        <span className="px-2 py-0.5 mt-1 text-xs font-medium bg-blue-900/50 text-blue-200 rounded-full border border-blue-800">
          {user.rol}
        </span>
      </div>

      {/* --- NAVEGACIÓN PRINCIPAL --- */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {links.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-[#1b263b] rounded-lg transition-all duration-200 group"
          >
            <span className="group-hover:text-blue-400 transition-colors">
              {link.icon}
            </span>
            <span className="font-medium">{link.label}</span>
          </Link>
        ))}

        {/* --- MENÚ DESPLEGABLE PERSONALIZACIÓN --- */}
        {userRole === "Administrador" && (
          <div className="pt-2 mt-2 border-t border-gray-800">
            <button
              onClick={() => setIsPersonalizacionOpen(!isPersonalizacionOpen)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isPersonalizacionOpen
                  ? "bg-[#1b263b] text-white"
                  : "text-gray-300 hover:bg-[#1b263b] hover:text-white"
              }`}
            >
              <Settings
                size={18}
                className={isPersonalizacionOpen ? "text-blue-400" : ""}
              />
              <span className="font-medium">Personalización</span>
              {isPersonalizacionOpen ? (
                <ChevronDown size={16} className="ml-auto text-gray-400" />
              ) : (
                <ChevronRight size={16} className="ml-auto text-gray-400" />
              )}
            </button>

            {/* Submenú con animación simple */}
            {isPersonalizacionOpen && (
              <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-700 pl-2">
                {personalizacionLinks.map((subLink) => (
                  <Link
                    key={subLink.href}
                    href={subLink.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1b263b]/50 rounded-md transition-all duration-200"
                  >
                    {/* Renderizado condicional del icono pequeño si quieres, o solo texto */}
                    <span className="opacity-70">{subLink.icon}</span>
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
          className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-all duration-200"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
