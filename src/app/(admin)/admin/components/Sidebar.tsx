"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
  Contact,
  Globe,
  Clock,
} from "lucide-react";

import CierresSidebar from "./admin/CierresSidebar";

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
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [canchas, setCanchas] = useState<
    { id_cancha: number; nombre: string }[]
  >([]);
  const [cierresOpen, setCierresOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const pathname = usePathname();

  const [isUsuariosOpen, setIsUsuariosOpen] = useState(false);
  const [isCanchasOpen, setIsCanchasOpen] = useState(true);
  const [isPersonalizacionOpen, setIsPersonalizacionOpen] = useState(false);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (pathname.includes("/admin/usuarios")) setIsUsuariosOpen(true);
  }, [pathname]);

  useEffect(() => {
    const loadUserAndRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let currentClubId = 9;
      let currentClubLogo = null;

      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        const subdomain = hostname.split(".")[0];
        if (subdomain && subdomain !== "localhost" && subdomain !== "www") {
          const { data: clubData } = await supabase
            .from("clubes")
            .select("id_club, logo_url")
            .eq("subdominio", subdomain)
            .maybeSingle();
          if (clubData) {
            currentClubId = clubData.id_club;
            currentClubLogo = clubData.logo_url;
          }
        }
      }
      setClubId(currentClubId);
      setClubLogo(currentClubLogo);

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("nombre, apellido")
        .eq("id_usuario", user.id)
        .single();

      const { data: memberships } = await supabase
        .from("club_usuarios")
        .select("id_rol")
        .eq("id_usuario", user.id)
        .eq("id_club", currentClubId);

      let roleKey: UserRole = "cliente";
      if (memberships && memberships.length > 0) {
        const roleIds = memberships.map((m) => m.id_rol);
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

  const usuariosLinks: MenuLink[] = [
    {
      key: "usuarios-manuales",
      href: "/admin/usuarios/manuales",
      label: "Manuales ",
      icon: <Contact size={14} />,
      allowedRoles: ["admin", "cajero"],
    },
    {
      key: "usuarios-web",
      href: "/admin/usuarios",
      label: "Registrados (Web)",
      icon: <Globe size={14} />,
      allowedRoles: ["admin", "cajero"],
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
  const visibleUsuariosLinks = usuariosLinks.filter((l) =>
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
        {/* HEADER */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4 bg-[#0b1623] relative">
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#1b263b] via-[#0d1b2a]/80 to-transparent pointer-events-none" />

          {/* Logo del Club Hero */}
          <div className="relative w-36 h-36 mb-4 z-10 group cursor-default">
            {clubLogo ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-600/20 blur-[40px] rounded-full transform scale-90 group-hover:scale-100 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/10 to-purple-500/10 blur-2xl rounded-full animate-pulse" />
                <Image
                  src={clubLogo}
                  alt="Logo Club"
                  fill
                  className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] pointer-events-none select-none transition-transform duration-500 group-hover:scale-[1.02]"
                  sizes="144px"
                  priority
                />
              </div>
            ) : (
              <div className="w-full h-full bg-[#1b263b] rounded-full flex items-center justify-center text-blue-400/50 border border-blue-900/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                <Building2 size={56} />
              </div>
            )}
          </div>

          {/* Widget de Fecha y Hora */}
          <div className="flex flex-col items-center justify-center w-full mb-5 z-10">
            <div className="flex items-center gap-2 text-2xl font-bold text-white tracking-widest font-mono drop-shadow-sm">
              {currentTime ? format(currentTime, "HH:mm") : "--:--"}
            </div>
            <div className="text-[11px] text-blue-300/70 font-bold uppercase tracking-widest">
              {currentTime
                ? format(currentTime, "EEEE d, MMMM", { locale: es })
                : "..."}
            </div>
          </div>

          {/* Tarjeta de Usuario */}
          <div className="w-full bg-[#16202e] rounded-xl p-3 border border-gray-800/60 flex items-center gap-3 shadow-lg relative z-10 group hover:border-gray-700 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md">
              {userData.nombreCompleto.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                {userData.nombreCompleto}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${userRole === "admin" ? "bg-blue-400" : "bg-emerald-400"} animate-pulse`}
                ></span>
                <span
                  className={`text-[9px] uppercase font-bold tracking-wider ${userRole === "admin" ? "text-blue-400" : "text-emerald-400"}`}
                >
                  {userData.rolLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* === CAMBIO CLAVE AQUÍ ===
          Se eliminó 'custom-scrollbar' y se agregaron clases nativas para ocultar la barra.
          [&::-webkit-scrollbar]:hidden -> Oculta en Chrome/Safari
          [-ms-overflow-style:none] -> Oculta en IE/Edge
          [scrollbar-width:none] -> Oculta en Firefox
        */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {visibleMainLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group font-medium text-sm border border-transparent ${isActive(link.href) ? "bg-[#1b263b] text-white shadow-md border-gray-700/50" : "text-gray-400 hover:text-white hover:bg-[#1b263b]/50"}`}
            >
              <span
                className={`transition-colors ${isActive(link.href) ? "text-blue-400" : "group-hover:text-blue-400"}`}
              >
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          ))}

          {visibleUsuariosLinks.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setIsUsuariosOpen(!isUsuariosOpen)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${isUsuariosOpen ? "bg-[#1b263b] text-white" : "text-gray-400 hover:bg-[#1b263b] hover:text-white"}`}
              >
                <Users
                  size={18}
                  className={isUsuariosOpen ? "text-purple-400" : ""}
                />
                <span className="font-medium flex-1 text-left">Usuarios</span>
                {isUsuariosOpen ? (
                  <ChevronDown size={14} className="text-gray-500" />
                ) : (
                  <ChevronRight size={14} className="text-gray-500" />
                )}
              </button>
              {isUsuariosOpen && (
                <div className="mt-1 ml-3 space-y-0.5 border-l border-gray-700 pl-3">
                  {visibleUsuariosLinks.map((subLink) => (
                    <Link
                      key={subLink.key}
                      href={subLink.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${isActive(subLink.href) ? "text-white bg-[#1b263b]/80" : "text-gray-400 hover:text-white hover:bg-[#1b263b]/50"}`}
                    >
                      <span className="opacity-70 text-purple-300">
                        {subLink.icon}
                      </span>
                      {subLink.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

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
              <p className="px-3 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Administración
              </p>
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

        {/* FOOTER */}
        <div className="p-3 border-t border-gray-800 bg-[#0b1623] space-y-2 pb-2">
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

          {/* Marca de agua */}
          <div className="pt-2 text-center pb-1 select-none">
            <p className="text-[9px] text-gray-700 font-bold tracking-[0.2em] opacity-40 hover:opacity-70 transition-opacity">
              POWERED BY <span className="text-gray-500">VERSORI</span>
            </p>
          </div>
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
