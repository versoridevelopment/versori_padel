import "../globals.css";
import Navbar from "@/app/(public)/components/layout/Navbar";
import Footer from "@/app/(public)/components/layout/Footer";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { Montserrat } from "next/font/google";
import { Metadata } from "next";
import { supabase } from "@/lib/supabase/supabaseClient";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// --- GENERACIÓN DE METADATOS (FAVICON DINÁMICO) ---
export async function generateMetadata(): Promise<Metadata> {
  const club = await getCurrentClub();
  const timestamp = new Date().getTime();
  const iconUrl = club?.logo_url
    ? `${club.logo_url}?v=${timestamp}`
    : "/icon.png";

  return {
    title: club?.nombre || "Ferpadel",
    description: "Reserva tu cancha de pádel",
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
  };
}

// --- COMPONENTE LAYOUT ---
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const club = await getCurrentClub();

  let tieneQuincho = false;
  let showNosotros = true;
  let showProfesores = true;

  if (club) {
    const [quinchoRes, nosotrosRes, clubConfigRes] = await Promise.all([
      supabase
        .from("quinchos")
        .select("activo")
        .eq("id_club", club.id_club)
        .maybeSingle(),
      supabase
        .from("nosotros")
        .select("activo_nosotros")
        .eq("id_club", club.id_club)
        .maybeSingle(),
      supabase
        .from("clubes")
        .select("activo_profesores")
        .eq("id_club", club.id_club)
        .single(),
    ]);

    tieneQuincho = quinchoRes.data?.activo || false;
    showNosotros = nosotrosRes.data?.activo_nosotros ?? true;
    showProfesores = clubConfigRes.data?.activo_profesores ?? true;
  }

  return (
    <html lang="es">
      <body
        // CAMBIOS AQUÍ:
        // 1. flex flex-col: Estructura vertical flexible (Footer siempre abajo).
        // 2. overflow-x-hidden: Evita scroll lateral accidental en móviles.
        // 3. antialiased: Suaviza las fuentes en pantallas retina/móviles.
        className={`relative min-h-screen flex flex-col overflow-x-hidden antialiased text-white bg-black ${montserrat.className}`}
      >
        {/* Fondo Gradiente Global */}
        <div className="fixed inset-0 -z-50 bg-gradient-to-b from-[#06090e] via-[#0b1018] to-[#121a22]" />

        <Navbar
          club={club}
          tieneQuincho={tieneQuincho}
          showNosotros={showNosotros}
          showProfesores={showProfesores}
        />

        {/* CAMBIO AQUÍ: w-full asegura que ocupe todo el ancho disponible sin desbordar */}
        <main className="flex-grow w-full relative">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
