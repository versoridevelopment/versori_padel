"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
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
  Users2,
  Trophy,
  Home,
  Tag,
  Menu,
  X,
  CalendarClock,
  BookOpen,
  LayoutGrid,
  ExternalLink,
  User as UserIcon,
} from "lucide-react";

import CierresSidebar from "./admin/CierresSidebar"; // Ajusta ruta si es necesario

// Tipos
type UserRole = "admin" | "cajero" | "staff" | "profe" | "cliente";

const ROLE_MAP: Record<number, UserRole> = {
  1: "admin",
  2: "staff",
  3: "cliente",
  4: "profe",
  5: "cajero",
};

type MenuLink = {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
};

export function Sidebar() {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  const [userRole, setUserRole] = useState<UserRole>("cliente");
  const [userData, setUserData] = useState<{
    nombreCompleto: string;
    rolLabel: string;
    fotoPerfil: string | null;
  }>({
    nombreCompleto: "Cargando...",
    rolLabel: "...",
    fotoPerfil: null,
  });

  const [clubId, setClubId] = useState<number>(9);
  const [canchas, setCanchas] = useState<
    { id_cancha: number; nombre: string }[]
  >([]);
  const [cierresOpen, setCierresOpen] = useState(false);

  const pathname = usePathname();
  const [isCanchasOpen, setIsCanchasOpen] = useState(true);
  const [isPersonalizacionOpen, setIsPersonalizacionOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getInitials = (name: string) => {
    if (!name || name === "Cargando...") return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  useEffect(() => {
    const loadUserAndRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Determinar ID Club
      let currentClubId = 9;
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const subdomain = hostname.split(".")[0];
        if (subdomain && subdomain !== "localhost" && subdomain !== "www") {
          const { data: clubData } = await supabase
            .from("clubes")
            .select("id_club")
            .eq("subdominio", subdomain)
            .maybeSingle();
          if (clubData) currentClubId = clubData.id_club;
        }
      }
      setClubId(currentClubId);

      // Cargar canchas para el drawer de cierres
      const { data: canchasData } = await supabase
        .from("canchas")
        .select("id_cancha,nombre")
        .eq("id_club", currentClubId)
        .order("id_cancha", { ascending: true });
      setCanchas(
        (canchasData ?? []).map((c) => ({
          id_cancha: c.id_cancha,
          nombre: c.nombre,
        })),
      );

      // 2. Obtener Perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, apellido")
        .eq("id_usuario", user.id)
        .single();

      // 3. Obtener Roles (ARRAY)
      // Usamos .select('id_rol') sin .single() para evitar errores si tiene múltiples roles
      const { data: memberships } = await supabase
        .from("club_usuarios")
        .select("id_rol")
        .eq("id_usuario", user.id)
        .eq("id_club", currentClubId);

      // 4. Lógica de Jerarquía de Roles
      // Si tiene varios roles, nos quedamos con el más alto para mostrar el menú
      let roleKey: UserRole = "cliente";

      if (memberships && memberships.length > 0) {
        const roleIds = memberships.map((m) => m.id_rol);

        // Jerarquía: Admin > Cajero > Staff > Profe > Cliente
        if (roleIds.includes(1)) roleKey = "admin";
        else if (roleIds.includes(5)) roleKey = "cajero";
        else if (roleIds.includes(2)) roleKey = "staff";
        else if (roleIds.includes(4)) roleKey = "profe";
        else roleKey = ROLE_MAP[roleIds[0]] || "cliente";
      }

      setUserData({
        nombreCompleto: profile
          ? `${profile.nombre} ${profile.apellido}`
          : "Usuario",
        rolLabel: roleKey.charAt(0).toUpperCase() + roleKey.slice(1),
        fotoPerfil: null,
      });

      setUserRole(roleKey);
    };

    loadUserAndRole();
  }, [supabase]);

  const handleLogout = async () => {
    if (window.confirm("¿Cerrar sesión del panel?")) {
      await supabase.auth.signOut();
      await fetch("/api/auth/signout", { method: "POST", cache: "no-store" });
      window.location.href = "/";
    }
  };

  const closeMobileMenu = () => setIsMobileOpen(false);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // CONFIG MENU
  const mainLinks: MenuLink[] = [
    {
      key: "dashboard",
      href: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      allowedRoles: ["admin", "cajero", "staff"],
    },
    {
      key: "reservas",
      href: "/admin/reservas",
      label: "Reservas",
      icon: <Calendar size={18} />,
      allowedRoles: ["admin", "cajero", "staff"],
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
    {
      key: "turnos-fijos",
      href: "/admin/turnos-fijos",
      label: "Turnos fijos",
      icon: <CalendarClock size={18} />,
      allowedRoles: ["admin", "cajero", "staff"],
    },
  ];

  const gestionLinks: MenuLink[] = [
    {
      key: "mis-canchas",
      href: "/admin/personalizacion/canchas",
      label: "Mis Canchas",
      icon: <Trophy size={14} />,
      allowedRoles: ["admin"],
    },
    {
      key: "tarifarios",
      href: "/admin/personalizacion/tarifarios",
      label: "Tarifarios",
      icon: <Tag size={14} />,
      allowedRoles: ["admin"],
    },
  ];

  const personalizacionLinks: MenuLink[] = [
    {
      key: "config-club",
      href: "/admin/personalizacion/club",
      label: "Config General",
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

  const visibleMainLinks = mainLinks.filter((l) =>
    l.allowedRoles.includes(userRole),
  );
  const visibleGestionLinks = gestionLinks.filter((l) =>
    l.allowedRoles.includes(userRole),
  );
  const visiblePersonalizacionLinks = personalizacionLinks.filter((l) =>
    l.allowedRoles.includes(userRole),
  );

  if (!isMounted) return null;

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#0d1b2a] text-white rounded-lg shadow-lg border border-gray-700 hover:bg-[#1b263b] transition-colors"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#0d1b2a] text-white flex flex-col justify-between shadow-2xl z-40 overflow-hidden transition-transform duration-300 ease-in-out ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex flex-col items-center p-6 border-b border-gray-800 bg-[#0b1623]">
          <Link
            href="/admin/usuario"
            onClick={closeMobileMenu}
            className="group relative"
          >
            <div className="relative w-16 h-16 mx-auto transition-transform duration-300 group-hover:scale-105">
              <div className="rounded-full overflow-hidden border-2 border-blue-500/30 w-16 h-16 bg-gray-800 relative flex items-center justify-center">
                {userData.fotoPerfil ? (
                  <Image
                    src={userData.fotoPerfil}
                    alt="Perfil"
                    fill
                    className="object-cover"
                    sizes="64px"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-[#1b263b] flex items-center justify-center text-blue-300 font-bold text-xl">
                    {getInitials(userData.nombreCompleto) || <UserIcon />}
                  </div>
                )}
              </div>
              <div
                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0b1623] rounded-full"
                title="Online"
              ></div>
            </div>
          </Link>
          <h2 className="mt-3 text-sm font-semibold tracking-wide text-gray-100 text-center">
            {userData.nombreCompleto}
          </h2>
          <span
            className={`px-2 py-0.5 mt-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${userRole === "admin" ? "bg-blue-900/40 text-blue-300 border-blue-800/50" : "bg-emerald-900/40 text-emerald-300 border-emerald-800/50"}`}
          >
            {userData.rolLabel}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {visibleMainLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group font-medium text-sm ${isActive(link.href) ? "bg-[#1b263b] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-[#1b263b]/50"}`}
            >
              <span
                className={`transition-colors ${isActive(link.href) ? "text-blue-400" : "group-hover:text-blue-400"}`}
              >
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          ))}

          {/* BOTÓN CIERRES (Visible para roles permitidos) */}
          {(userRole === "admin" ||
            userRole === "staff" ||
            userRole === "cajero") && (
            <button
              onClick={() => {
                setCierresOpen(true);
                closeMobileMenu();
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group font-medium text-sm text-gray-400 hover:text-white hover:bg-[#1b263b]/50"
            >
              <span className="transition-colors group-hover:text-blue-400">
                <CalendarClock size={18} />
              </span>
              <span>Cierres</span>
            </button>
          )}

          {visibleGestionLinks.length > 0 && (
            <div className="pt-4 mt-2 border-t border-gray-800/50">
              <button
                onClick={() => setIsCanchasOpen(!isCanchasOpen)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${isCanchasOpen ? "bg-[#1b263b] text-white" : "text-gray-400 hover:bg-[#1b263b] hover:text-white"}`}
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
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${isActive(subLink.href) ? "text-white bg-[#1b263b]/80" : "text-gray-400 hover:text-white hover:bg-[#1b263b]/50"}`}
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

          {visiblePersonalizacionLinks.length > 0 && (
            <div className="pt-2 mt-2">
              <button
                onClick={() => setIsPersonalizacionOpen(!isPersonalizacionOpen)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${isPersonalizacionOpen ? "bg-[#1b263b] text-white" : "text-gray-400 hover:bg-[#1b263b] hover:text-white"}`}
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
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${isActive(subLink.href) ? "text-white bg-[#1b263b]/80" : "text-gray-400 hover:text-white hover:bg-[#1b263b]/50"}`}
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

        <div className="p-3 border-t border-gray-800 bg-[#0b1623] space-y-2 pb-6 md:pb-3">
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all border border-gray-800 hover:border-gray-700"
          >
            <ExternalLink size={14} /> Volver al sitio
          </Link>
          <button
            onClick={() => {
              handleLogout();
              closeMobileMenu();
            }}
            className="flex w-full items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-lg transition-all duration-200 border border-transparent hover:border-red-900/30"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <CierresSidebar
        isOpen={cierresOpen}
        onClose={() => setCierresOpen(false)}
        idClub={clubId}
        canchas={canchas}
      />
    </>
  );
}
