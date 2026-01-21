"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation"; // Para resaltar link activo
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
  Users2, // Icono Profesores
  Trophy,
  Home,
  Tag,
  Menu,
  X,
  BookOpen,
  LayoutGrid,
} from "lucide-react";

// Definimos los roles posibles (esto debería coincidir con tu BD/Auth)
type UserRole = "admin" | "cajero";

// Tipo para un enlace del menú
type MenuLink = {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[]; // Quién puede ver esto
};

export function Sidebar() {
  // --- ESTADO DEL USUARIO ---
  // Aquí simulo el rol. En tu app real, esto vendría de tu contexto de Auth o Supabase.
  // Cambia "admin" por "cajero" para probar la vista restringida.
  const [userRole, setUserRole] = useState<UserRole>("admin");

  const user = {
    nombreCompleto: "Juan Cruz",
    rol: userRole === "admin" ? "Administrador" : "Cajero",
    fotoPerfil: "/placeholder-avatar.png",
  };

  const pathname = usePathname();

  // --- ESTADOS DE UI ---
  const [isCanchasOpen, setIsCanchasOpen] = useState(true);
  const [isPersonalizacionOpen, setIsPersonalizacionOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ==========================================
  // CONFIGURACIÓN DEL MENÚ (Centralizada)
  // ==========================================

  // 1. GRUPO PRINCIPAL
  const mainLinks: MenuLink[] = [
    {
      key: "dashboard",
      href: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      allowedRoles: ["admin", "cajero"],
    },
    {
      key: "reservas",
      href: "/admin/reservas",
      label: "Reservas",
      icon: <Calendar size={18} />,
      allowedRoles: ["admin", "cajero"],
    },
    {
      key: "usuarios",
      href: "/admin/usuarios",
      label: "Usuarios",
      icon: <Users size={18} />,
      allowedRoles: ["admin", "cajero"],
    },
    {
      key: "pagos",
      href: "/admin/pagos",
      label: "Pagos / Caja",
      icon: <CreditCard size={18} />,
      allowedRoles: ["admin", "cajero"],
    },
  ];

  // 2. GRUPO GESTIÓN (Canchas & Tarifas)
  const gestionLinks: MenuLink[] = [
    {
      key: "mis-canchas",
      href: "/admin/personalizacion/canchas",
      label: "Mis Canchas",
      icon: <Trophy size={14} />,
      allowedRoles: ["admin"], // Solo admin configura canchas
    },
    {
      key: "tarifarios",
      href: "/admin/personalizacion/tarifarios",
      label: "Tarifarios",
      icon: <Tag size={14} />,
      allowedRoles: ["admin"], // Solo admin toca precios
    },
  ];

  // 3. GRUPO PERSONALIZACIÓN WEB
  const personalizacionLinks: MenuLink[] = [
    {
      key: "config-club",
      href: "/admin/personalizacion/club",
      label: "Config General / Home",
      icon: <Building2 size={14} />,
      allowedRoles: ["admin"],
    },
    {
      key: "pagina-nosotros",
      href: "/admin/personalizacion/nosotros",
      label: "Página Nosotros",
      icon: <BookOpen size={14} />,
      allowedRoles: ["admin"],
    },
    {
      key: "pagina-profesores",
      href: "/admin/personalizacion/profesores",
      label: "Página Profesores",
      icon: <Users2 size={14} />,
      allowedRoles: ["admin"],
    },
    {
      key: "pagina-quincho",
      href: "/admin/quinchos",
      label: "Página Quincho",
      icon: <Home size={14} />,
      allowedRoles: ["admin"],
    },
  ];

  // --- FILTRADO DE ENLACES SEGÚN ROL ---
  const visibleMainLinks = mainLinks.filter((link) =>
    link.allowedRoles.includes(userRole),
  );
  const visibleGestionLinks = gestionLinks.filter((link) =>
    link.allowedRoles.includes(userRole),
  );
  const visiblePersonalizacionLinks = personalizacionLinks.filter((link) =>
    link.allowedRoles.includes(userRole),
  );

  // --- LOGICA UI ---
  const handleLogout = () => {
    alert("Cerrando sesión...");
    // Aquí iría tu lógica real de logout (supabase.auth.signOut())
  };

  const closeMobileMenu = () => setIsMobileOpen(false);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileOpen]);

  // Helper para saber si un link está activo
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* 1. BOTÓN MÓVIL */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#0d1b2a] text-white rounded-lg shadow-lg border border-gray-700 hover:bg-[#1b263b] transition-colors"
        aria-label="Menú"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* 2. OVERLAY */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 3. SIDEBAR */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen w-64 
          bg-[#0d1b2a] text-white flex flex-col justify-between shadow-2xl 
          z-40 overflow-hidden transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* --- HEADER USUARIO --- */}
        <div className="flex flex-col items-center p-6 border-b border-gray-800 bg-[#0b1623]">
          <Link
            href="/admin/usuario"
            className="group relative"
            onClick={closeMobileMenu}
          >
            <div className="relative w-16 h-16 mx-auto transition-transform duration-300 group-hover:scale-105">
              <div className="rounded-full overflow-hidden border-2 border-blue-500/30 w-16 h-16 bg-gray-800 relative">
                {/* Fallback si no hay imagen real */}
                <Image
                  src={user.fotoPerfil}
                  alt="Perfil"
                  fill
                  className="object-cover"
                  sizes="64px"
                  priority
                />
              </div>
              <div
                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0b1623] rounded-full"
                title="Online"
              ></div>
            </div>
          </Link>
          <h2 className="mt-3 text-sm font-semibold tracking-wide text-gray-100">
            {user.nombreCompleto}
          </h2>
          <span
            className={`px-2 py-0.5 mt-1 text-[10px] uppercase font-bold tracking-wider rounded-full border 
            ${userRole === "admin" ? "bg-blue-900/40 text-blue-300 border-blue-800/50" : "bg-purple-900/40 text-purple-300 border-purple-800/50"}`}
          >
            {user.rol}
          </span>

          {/* TOGGLE TEMPORAL PARA PROBAR ROLES (BORRAR EN PRODUCCIÓN) */}
          {/* <button 
            onClick={() => setUserRole(userRole === 'admin' ? 'cajero' : 'admin')}
            className="mt-2 text-[9px] text-gray-500 hover:text-white underline"
          >
            [Dev: Cambiar Rol]
          </button> */}
        </div>

        {/* --- NAVEGACIÓN --- */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {/* 1. LINKS PRINCIPALES (Siempre visibles si tienen permiso) */}
          {visibleMainLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group font-medium text-sm
                ${isActive(link.href) ? "bg-[#1b263b] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-[#1b263b]/50"}
              `}
            >
              <span
                className={`transition-colors ${isActive(link.href) ? "text-blue-400" : "group-hover:text-blue-400"}`}
              >
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          ))}

          {/* 2. GRUPO: GESTIÓN (Solo si hay items visibles) */}
          {visibleGestionLinks.length > 0 && (
            <div className="pt-4 mt-2 border-t border-gray-800/50">
              <button
                onClick={() => setIsCanchasOpen(!isCanchasOpen)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm 
                  ${isCanchasOpen ? "bg-[#1b263b] text-white" : "text-gray-400 hover:bg-[#1b263b] hover:text-white"}
                `}
              >
                <LayoutGrid
                  size={18}
                  className={isCanchasOpen ? "text-green-400" : ""}
                />
                <span className="font-medium flex-1 text-left">Gestión</span>
                {isCanchasOpen ? (
                  <ChevronDown size={14} className="text-gray-500" />
                ) : (
                  <ChevronRight size={14} className="text-gray-500" />
                )}
              </button>

              {isCanchasOpen && (
                <div className="mt-1 ml-3 space-y-0.5 border-l border-gray-700 pl-3">
                  {visibleGestionLinks.map((subLink) => (
                    <Link
                      key={subLink.key}
                      href={subLink.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200
                        ${isActive(subLink.href) ? "text-white bg-[#1b263b]/80" : "text-gray-400 hover:text-white hover:bg-[#1b263b]/50"}
                      `}
                    >
                      <span className="opacity-70 text-green-300">
                        {subLink.icon}
                      </span>
                      {subLink.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. GRUPO: PERSONALIZACIÓN (Solo si hay items visibles) */}
          {visiblePersonalizacionLinks.length > 0 && (
            <div className="pt-2 mt-2">
              <button
                onClick={() => setIsPersonalizacionOpen(!isPersonalizacionOpen)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm 
                  ${isPersonalizacionOpen ? "bg-[#1b263b] text-white" : "text-gray-400 hover:bg-[#1b263b] hover:text-white"}
                `}
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

              {isPersonalizacionOpen && (
                <div className="mt-1 ml-3 space-y-0.5 border-l border-gray-700 pl-3">
                  {visiblePersonalizacionLinks.map((subLink) => (
                    <Link
                      key={subLink.key}
                      href={subLink.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200
                        ${isActive(subLink.href) ? "text-white bg-[#1b263b]/80" : "text-gray-400 hover:text-white hover:bg-[#1b263b]/50"}
                      `}
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

        {/* --- PIE DE PÁGINA --- */}
        <div className="p-3 border-t border-gray-800 bg-[#0b1623]">
          <button
            onClick={() => {
              handleLogout();
              closeMobileMenu();
            }}
            className="flex w-full items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-lg transition-all duration-200 border border-transparent hover:border-red-900/30"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
