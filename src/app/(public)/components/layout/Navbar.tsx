"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image"; // Import Image
import Container from "../ui/Container";
import { supabase } from "../../../../lib/supabase/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import type { Club } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { Menu, X, LogOut, User } from "lucide-react";

// 1. TYPES
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

// 2. COMPONENT
const Navbar = ({
  club,
  tieneQuincho,
  showNosotros,
  showProfesores,
}: NavbarProps) => {
  const [hidden, setHidden] = useState<boolean>(false);
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // MOBILE MENU STATE
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Scroll Logic ---
  useEffect(() => {
    const handleScroll = () => {
      // If mobile menu is open, DO NOT hide the bar
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

  // --- Auth Logic ---
  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session) fetchProfile(session.user.id);
    };

    fetchSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
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
    const isConfirmed = window.confirm(
      "¿Estás seguro de que querés cerrar sesión?"
    );
    if (isConfirmed) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  // Closes the menu when a link is clicked
  const closeMenu = () => setIsMobileMenuOpen(false);

  // Lock body scroll when menu is open
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
          {/* --- 1. LOGO + NAME (Left) --- */}
          <Link
            href="/"
            className="flex items-center gap-3 z-50 relative shrink-0 group"
            onClick={closeMenu}
            aria-label="Ir al inicio"
          >
            {/* If there is a logo URL, show the image */}
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

          {/* --- 2. DESKTOP NAV (Strictly hidden on mobile) --- */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6 text-sm font-medium text-neutral-300">
              {showProfesores && (
                <Link
                  href="/profesores"
                  className="hover:text-white transition"
                >
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
                <span className="text-neutral-400 text-xs text-right whitespace-nowrap">
                  {userProfile
                    ? `${userProfile.nombre} ${userProfile.apellido}`
                    : "Usuario"}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 transition"
                  title="Cerrar Sesión"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>

          {/* --- 3. MOBILE HAMBURGER BUTTON (Visible only on mobile) --- */}
          <button
            className="md:hidden text-white z-50 relative p-2 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </Container>
      </header>

      {/* --- 4. MOBILE MENU OVERLAY (Full Screen) --- */}
      <div
        className={`fixed inset-0 bg-[#0b0d12] z-40 flex flex-col justify-center items-center gap-8 transition-opacity duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
        // ADDED: Close menu when clicking the overlay
        onClick={closeMenu}
      >
        {/* ADDED: Stop propagation to prevent closing when clicking inside the menu content */}
        <div
          className="flex flex-col items-center gap-8 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Links */}
          <div className="flex flex-col items-center gap-8 text-2xl font-bold text-neutral-300">
            {showProfesores && (
              <Link
                href="/profesores"
                onClick={closeMenu}
                className="hover:text-white transition"
              >
                Profesores
              </Link>
            )}
            {showNosotros && (
              <Link
                href="/nosotros"
                onClick={closeMenu}
                className="hover:text-white transition"
              >
                Nosotros
              </Link>
            )}
            {tieneQuincho && (
              <Link
                href="/quinchos"
                onClick={closeMenu}
                className="hover:text-white transition"
              >
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
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="text-xl text-neutral-300 hover:text-white"
                >
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
                <div className="flex items-center gap-3 text-neutral-300 text-lg">
                  <User size={24} />
                  <span>
                    {userProfile ? `${userProfile.nombre}` : "Mi Cuenta"}
                  </span>
                </div>
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
