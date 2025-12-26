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

// --- GENERACIÓN DE METADATOS ---
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
  // 1. Obtener club
  const club = await getCurrentClub();

  // 2. Calcular si tiene quincho (Lógica dentro del componente)
  let tieneQuincho = false;

  if (club) {
    const { data: quinchoData } = await supabase
      .from("quinchos")
      .select("activo")
      .eq("id_club", club.id_club)
      .maybeSingle(); // Usamos maybeSingle para que no de error si no existe

    tieneQuincho = quinchoData?.activo || false;
  }

  return (
    <html lang="es">
      <body
        className={`relative min-h-screen text-white bg-black ${montserrat.className}`}
      >
        <div className="fixed inset-0 -z-50 bg-gradient-to-b from-[#06090e] via-[#0b1018] to-[#121a22]" />

        {/* 3. Pasar ambas props al Navbar */}
        <Navbar club={club} tieneQuincho={tieneQuincho} />

        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
