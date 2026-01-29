"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import Container from "../ui/Container";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Club } from "@/lib/ObetenerClubUtils/getCurrentClub";
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Loader2,
  LayoutDashboard,
  CalendarDays,
} from "lucide-react";

interface NavbarProps {
  club: Club | null;
  tieneQuincho: boolean;
  showNosotros: boolean;
  showProfesores: boolean;
  initialUser: User | null;
}

type UserProfile = {
  nombre: string | null;
  apellido: string | null;
  canAccessPanel?: boolean; // Cambiado de 'isAdmin' a 'canAccessPanel' para ser más genérico
};

const Navbar = ({
  club,
  tieneQuincho,
  showNosotros,
  showProfesores,
  initialUser,
}: NavbarProps) => {
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  const [hidden, setHidden] = useState<boolean>(false);
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  const [user, setUser] = useState<User | null>(initialUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meLoading, setMeLoading] = useState<boolean>(!initialUser);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsNavigating(false);
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  const handleNavClick = (href?: string) => {
    if (href === pathname) return;
    setIsNavigating(true);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isMobileMenuOpen) return;
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      setLastScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isMobileMenuOpen]);

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nombre, apellido")
          .eq("id_usuario", userId)
          .single();

        // Obtener roles para determinar acceso al panel
        const { data: rolesData } = await supabase
          .from("club_usuarios")
          .select("roles(nombre)")
          .eq("id_usuario", userId);
        // Nota: quitamos .eq('id_club', 1) para hacerlo más robusto si manejas multi-club en el futuro,
        // o asegúrate de que el ID del club sea el correcto.

        // Lógica de acceso: Admin, Cajero, Staff o Profe pueden ver el panel
        let canAccessPanel = false;
        if (rolesData && Array.isArray(rolesData)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          canAccessPanel = rolesData.some((r: any) =>
            ["admin", "cajero", "staff", "profe"].includes(r.roles?.nombre),
          );
        }

        setUserProfile({
          nombre: profile?.nombre ?? null,
          apellido: profile?.apellido ?? null,
          canAccessPanel,
        });
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setMeLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (initialUser) {
      if (user?.id !== initialUser.id) {
        setUser(initialUser);
        fetchProfile(initialUser.id);
      } else if (!userProfile && meLoading) {
        fetchProfile(initialUser.id);
      }
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUser(data.user);
          fetchProfile(data.user.id);
        } else {
          setMeLoading(false);
        }
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser((prev) => (prev?.id === currentUser?.id ? prev : currentUser));

      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setUserProfile(null);
        setMeLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialUser, supabase, fetchProfile]);

  const handleLogout = async () => {
    const isConfirmed = window.confirm(
      "¿Estás seguro de que querés cerrar sesión?",
    );
    if (isConfirmed) {
      setIsNavigating(true);
      try {
        await supabase.auth.signOut();
        await fetch("/api/auth/signout", { method: "POST", cache: "no-store" });
        window.location.href = "/";
      } catch (_) {
        window.location.href = "/";
      }
    }
  };

  const closeMenu = () => setIsMobileMenuOpen(false);
  const brandName = club?.nombre ?? "VERSORI";
  const brandDotColor = club?.color_primario ?? "#3b82f6";

  return (
    <>
      {isNavigating && (
        <div className="fixed inset-0 z-[100] bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-white font-medium text-lg animate-pulse">
              Cargando...
            </p>
          </div>
        </div>
      )}

      <header
        className={`fixed top-0 left-0 w-full z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}
      >
        <Container className="flex items-center justify-between py-4 h-20">
          <Link
            href="/"
            className="flex items-center gap-3 z-50 relative shrink-0 group"
            onClick={() => handleNavClick("/")}
          >
            {club?.logo_url && (
              <div className="relative w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-105">
                <Image
                  src={club.logo_url}
                  alt={`${brandName} Logo`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 32px, 40px"
                  priority
                />
              </div>
            )}
            <span className="text-xl font-bold text-white tracking-wide">
              {brandName}
              <span className="ml-0.5" style={{ color: brandDotColor }}>
                .
              </span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6 text-sm font-medium text-neutral-300">
              {showProfesores && (
                <Link
                  href="/profesores"
                  onClick={() => handleNavClick("/profesores")}
                  className="hover:text-white transition"
                >
                  Profesores
                </Link>
              )}
              {showNosotros && (
                <Link
                  href="/nosotros"
                  onClick={() => handleNavClick("/nosotros")}
                  className="hover:text-white transition"
                >
                  Nosotros
                </Link>
              )}
              {tieneQuincho && (
                <Link
                  href="/quinchos"
                  onClick={() => handleNavClick("/quinchos")}
                  className="hover:text-white transition"
                >
                  Quincho
                </Link>
              )}
              <Link
                href="/reserva"
                onClick={() => handleNavClick("/reserva")}
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition shadow-lg shadow-blue-900/20 whitespace-nowrap"
              >
                Hacé tu reserva
              </Link>
            </nav>

            {isMounted ? (
              !user ? (
                <div className="flex items-center gap-4 border-l border-neutral-800 pl-6 ml-2">
                  <Link
                    href="/login"
                    onClick={() => handleNavClick("/login")}
                    className="text-sm font-medium text-neutral-300 hover:text-white transition whitespace-nowrap"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => handleNavClick("/register")}
                    className="text-sm font-medium text-white hover:text-blue-400 transition whitespace-nowrap"
                  >
                    Registrarse
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-4 border-l border-neutral-800 pl-6 ml-2">
                  {/* BOTÓN PANEL (Visible para Admin, Cajero, Staff) */}
                  {userProfile?.canAccessPanel && (
                    <Link
                      href="/admin/"
                      onClick={() => handleNavClick("/admin/")}
                      className="flex items-center gap-2 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors shadow-[0_0_10px_rgba(250,204,21,0.3)] animate-in fade-in zoom-in duration-300"
                      title="Ir al Panel de Administración"
                    >
                      <LayoutDashboard size={16} strokeWidth={2.5} />
                      <span className="text-xs uppercase tracking-wide">
                        Panel
                      </span>
                    </Link>
                  )}

                  <Link
                    href="/mis-reservas"
                    onClick={() => handleNavClick("/mis-reservas")}
                    className="group flex flex-col items-end cursor-pointer ml-4 mr-2"
                    title="Ver mis reservas"
                  >
                    <span className="text-neutral-200 text-sm font-semibold whitespace-nowrap group-hover:text-blue-400 transition-colors">
                      Mis Turnos
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                      Historial
                    </span>
                  </Link>

                  <Link
                    href="/perfil"
                    onClick={() => handleNavClick("/perfil")}
                    className="group flex flex-col items-end cursor-pointer"
                    title="Ir a mi perfil"
                  >
                    <span className="text-neutral-200 text-sm font-semibold whitespace-nowrap group-hover:text-white transition-colors">
                      {userProfile?.nombre
                        ? `Hola, ${userProfile.nombre}`
                        : meLoading
                          ? "..."
                          : "Mi Cuenta"}
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                      Mi Perfil
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 transition p-1.5 hover:bg-white/5 rounded-full"
                    title="Cerrar Sesión"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )
            ) : (
              <div className="w-[140px] h-8"></div>
            )}
          </div>

          <button
            className="md:hidden text-white z-50 relative p-2 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </Container>
      </header>

      <div
        className={`fixed inset-0 bg-[#0b0d12] z-40 flex flex-col justify-center items-center gap-8 transition-opacity duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
      >
        <div className="flex flex-col items-center gap-8 w-full">
          <div className="flex flex-col items-center gap-8 text-2xl font-bold text-neutral-300">
            {showProfesores && (
              <Link
                href="/profesores"
                onClick={() => handleNavClick("/profesores")}
                className="hover:text-white transition"
              >
                Profesores
              </Link>
            )}
            {showNosotros && (
              <Link
                href="/nosotros"
                onClick={() => handleNavClick("/nosotros")}
                className="hover:text-white transition"
              >
                Nosotros
              </Link>
            )}
            {tieneQuincho && (
              <Link
                href="/quinchos"
                onClick={() => handleNavClick("/quinchos")}
                className="hover:text-white transition"
              >
                Quincho
              </Link>
            )}
            <Link
              href="/reserva"
              onClick={() => handleNavClick("/reserva")}
              className="text-lg font-bold text-white bg-blue-600 px-8 py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
            >
              Hacé tu reserva
            </Link>
          </div>

          <div className="w-full px-10 mt-12">
            {isMounted ? (
              !user ? (
                <div className="flex flex-col gap-6 text-center border-t border-neutral-800 pt-8">
                  <Link
                    href="/login"
                    onClick={() => handleNavClick("/login")}
                    className="text-xl text-neutral-300 hover:text-white"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => handleNavClick("/register")}
                    className="text-xl text-blue-400 hover:text-blue-300 font-bold"
                  >
                    Crear cuenta
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-6 items-center border-t border-neutral-800 pt-8">
                  <p className="text-white text-xl font-bold">
                    {userProfile?.nombre
                      ? `Hola, ${userProfile.nombre}`
                      : "Bienvenido"}
                  </p>

                  {userProfile?.canAccessPanel && (
                    <Link
                      href="/admin/"
                      onClick={() => handleNavClick("/admin/")}
                      className="flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                    >
                      <LayoutDashboard size={20} /> <span>PANEL ADMIN</span>
                    </Link>
                  )}

                  <Link
                    href="/mis-reservas"
                    onClick={() => handleNavClick("/mis-reservas")}
                    className="flex items-center gap-3 text-neutral-300 text-lg hover:text-blue-400 font-semibold"
                  >
                    <CalendarDays size={24} /> <span>Mis Reservas</span>
                  </Link>

                  <Link
                    href="/perfil"
                    onClick={() => handleNavClick("/perfil")}
                    className="flex items-center gap-3 text-neutral-300 text-lg hover:text-white"
                  >
                    <UserIcon size={24} /> <span>Mi Perfil</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMenu();
                    }}
                    className="text-red-400 flex items-center gap-2 font-medium text-lg bg-red-950/30 px-6 py-2 rounded-full mt-4"
                  >
                    <LogOut size={20} /> Cerrar Sesión
                  </button>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
