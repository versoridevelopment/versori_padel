"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Container from "../ui/Container";
import { supabase } from "../../../../lib/supabase/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import type { Club } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { Menu, X, LogOut, User } from "lucide-react";

// 1. TIPOS
interface NavbarProps {
  club: Club | null;
  tieneQuincho: boolean;
  showNosotros: boolean;
  showProfesores: boolean;
}

type UserProfile = {
  nombre: string | null;
  apellido: string | null;
};

type MeOk = {
  user: { id: string; email: string | null };
};

function isMeOk(x: any): x is MeOk {
  return !!x?.user?.id;
}

// 2. COMPONENTE
const Navbar = ({ club, tieneQuincho, showNosotros, showProfesores }: NavbarProps) => {
  const [hidden, setHidden] = useState<boolean>(false);
  const [lastScrollY, setLastScrollY] = useState<number>(0);

  // ⬇️ seguimos usando Session para no tocar el render actual (pero la “fuente de verdad” será /api/auth/me)
  const [session, setSession] = useState<Session | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meLoading, setMeLoading] = useState<boolean>(true);

  // ESTADO PARA EL MENÚ MÓVIL
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Scroll Logic ---
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

  // --- Auth Logic (robusto): /api/auth/me ---
  useEffect(() => {
    let alive = true;

    async function loadMeAndProfile() {
      try {
        setMeLoading(true);

        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok || !isMeOk(json)) {
          setSession(null);
          setUserProfile(null);
          return;
        }

        // Creamos una “session mínima” solo para que el JSX no cambie
        setSession({
          access_token: "",
          refresh_token: "",
          expires_in: 0,
          expires_at: 0,
          token_type: "bearer",
          user: {
            id: json.user.id,
            email: json.user.email ?? undefined,
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          } as any,
        });

        await fetchProfile(json.user.id);
      } catch {
        setSession(null);
        setUserProfile(null);
      } finally {
        if (alive) setMeLoading(false);
      }
    }

    loadMeAndProfile();

    return () => {
      alive = false;
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nombre, apellido")
      .eq("id_usuario", userId)
      .single();

    setUserProfile(profile ?? null);
  };

  const handleLogout = async () => {
    const isConfirmed = window.confirm("¿Estás seguro de que querés cerrar sesión?");
    if (isConfirmed) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  // Bloquear scroll body
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const brandName = club?.nombre ?? "VERSORI";
  const brandDotColor = club?.color_primario ?? "#3b82f6";

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 transition-transform duration-300 ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <Container className="flex items-center justify-between py-4 h-20">
          {/* --- 1. LOGO + NOMBRE --- */}
          <Link
            href="/"
            className="flex items-center gap-3 z-50 relative shrink-0 group"
            onClick={closeMenu}
            aria-label="Ir al inicio"
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

          {/* --- 2. DESKTOP NAV --- */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6 text-sm font-medium text-neutral-300">
              {showProfesores && (
                <Link href="/profesores" className="hover:text-white transition">
                  Profesores
                </Link>
              )}
              {showNosotros && (
                <Link href="/nosotros" className="hover:text-white transition">
                  Nosotros
                </Link>
              )}
              {tieneQuincho && (
                <Link href="/quinchos" className="hover:text-white transition">
                  Quincho
                </Link>
              )}

              <Link
                href="/reserva"
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition shadow-lg shadow-blue-900/20 whitespace-nowrap"
              >
                Hacé tu reserva
              </Link>
            </nav>

            {/* User Section Desktop */}
            {!session ? (
              <div className="flex items-center gap-4 border-l border-neutral-800 pl-6 ml-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-neutral-300 hover:text-white transition whitespace-nowrap"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium text-white hover:text-blue-400 transition whitespace-nowrap"
                >
                  Registrarse
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4 border-l border-neutral-800 pl-6 ml-2">
                <Link
                  href="/perfil"
                  className="group flex flex-col items-end cursor-pointer"
                  title="Ir a mi perfil"
                >
                  <span className="text-neutral-400 text-xs text-right whitespace-nowrap group-hover:text-white transition-colors font-medium">
                    {meLoading
                      ? "Cargando…"
                      : userProfile
                      ? `${userProfile.nombre ?? ""} ${userProfile.apellido ?? ""}`.trim() || "Mi Cuenta"
                      : "Mi Cuenta"}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 transition p-1 hover:bg-white/5 rounded-full"
                  title="Cerrar Sesión"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>

          {/* --- 3. MOBILE HAMBURGER --- */}
          <button
            className="md:hidden text-white z-50 relative p-2 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </Container>
      </header>

      {/* --- 4. MOBILE MENU OVERLAY --- */}
      <div
        className={`fixed inset-0 bg-[#0b0d12] z-40 flex flex-col justify-center items-center gap-8 transition-opacity duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={closeMenu}
      >
        <div className="flex flex-col items-center gap-8 w-full" onClick={(e) => e.stopPropagation()}>
          {/* Mobile Links */}
          <div className="flex flex-col items-center gap-8 text-2xl font-bold text-neutral-300">
            {showProfesores && (
              <Link href="/profesores" onClick={closeMenu} className="hover:text-white transition">
                Profesores
              </Link>
            )}
            {showNosotros && (
              <Link href="/nosotros" onClick={closeMenu} className="hover:text-white transition">
                Nosotros
              </Link>
            )}
            {tieneQuincho && (
              <Link href="/quinchos" onClick={closeMenu} className="hover:text-white transition">
                Quincho
              </Link>
            )}

            <div className="h-px w-20 bg-neutral-800 my-2"></div>

            <Link
              href="/reserva"
              onClick={closeMenu}
              className="text-lg font-bold text-white bg-blue-600 px-8 py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
            >
              Hacé tu reserva
            </Link>
          </div>

          {/* Mobile Auth */}
          <div className="w-full px-10 mt-12">
            {!session ? (
              <div className="flex flex-col gap-6 text-center border-t border-neutral-800 pt-8">
                <Link href="/login" onClick={closeMenu} className="text-xl text-neutral-300 hover:text-white">
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="text-xl text-blue-400 hover:text-blue-300 font-bold"
                >
                  Crear cuenta
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-6 items-center border-t border-neutral-800 pt-8">
                <Link
                  href="/perfil"
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-neutral-300 text-lg hover:text-white transition-colors"
                >
                  <User size={24} />
                  <span>
                    {meLoading
                      ? "Cargando…"
                      : userProfile
                      ? `${userProfile.nombre ?? ""} ${userProfile.apellido ?? ""}`.trim() || "Mi Cuenta"
                      : "Mi Cuenta"}
                  </span>
                </Link>

                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu();
                  }}
                  className="text-red-400 flex items-center gap-2 font-medium text-lg bg-red-950/30 px-6 py-2 rounded-full"
                >
                  <LogOut size={20} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
