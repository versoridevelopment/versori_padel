import "../globals.css";
import Navbar from "@/app/(public)/components/layout/Navbar";
import Footer from "@/app/(public)/components/layout/Footer";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { Montserrat } from "next/font/google";
import { Metadata } from "next";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// --- AQUÍ ESTÁ LA MAGIA DEL ÍCONO DINÁMICO ---
export async function generateMetadata(): Promise<Metadata> {
  // 1. Obtenemos los datos del club desde el servidor
  const club = await getCurrentClub();

  return {
    title: club?.nombre || "Ferpadel",
    description: "Reserva tu cancha de pádel",
    icons: {
      // 2. Si existe un logo subido, úsalo como ícono. Si no, usa el default.
      icon: club?.logo_url || "/favicon.ico",
      shortcut: club?.logo_url || "/favicon.ico",
      apple: club?.logo_url || "/favicon.ico", // Para iPhone/iPad
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const club = await getCurrentClub();

  return (
    <html lang="es">
      <body
        className={`relative min-h-screen text-white bg-black ${montserrat.className}`}
      >
        {/* Fondo fijo degradado */}
        <div className="fixed inset-0 -z-50 bg-gradient-to-b from-[#06090e] via-[#0b1018] to-[#121a22]" />

        <Navbar club={club} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
