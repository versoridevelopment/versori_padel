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
  // 1. Obtenemos datos frescos
  const club = await getCurrentClub();

  // 2. Generamos una marca de tiempo actual para romper caché
  const timestamp = new Date().getTime();

  // 3. Construimos la URL
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

  // Estados por defecto (si falla la carga, mostramos todo por seguridad)
  let tieneQuincho = false;
  let showNosotros = true;
  let showProfesores = true;

  if (club) {
    // Usamos Promise.all para hacer las 3 consultas en paralelo (más rápido)
    const [quinchoRes, nosotrosRes, clubConfigRes] = await Promise.all([
      // 1. Chequear Quincho
      supabase
        .from("quinchos")
        .select("activo")
        .eq("id_club", club.id_club)
        .maybeSingle(),

      // 2. Chequear Nosotros (Tabla 'nosotros')
      supabase
        .from("nosotros")
        .select("activo_nosotros")
        .eq("id_club", club.id_club)
        .maybeSingle(),

      // 3. Chequear Profesores (Tabla 'clubes' - CORREGIDO)
      supabase
        .from("clubes")
        .select("activo_profesores")
        .eq("id_club", club.id_club)
        .single(),
    ]);

    // Asignamos los valores
    tieneQuincho = quinchoRes.data?.activo || false;

    // Si es null o undefined, asumimos true por defecto
    showNosotros = nosotrosRes.data?.activo_nosotros ?? true;
    showProfesores = clubConfigRes.data?.activo_profesores ?? true;
  }

  return (
    <html lang="es">
      <body
        className={`relative min-h-screen text-white bg-black ${montserrat.className}`}
      >
        {/* Fondo Gradiente Global */}
        <div className="fixed inset-0 -z-50 bg-gradient-to-b from-[#06090e] via-[#0b1018] to-[#121a22]" />

        <Navbar
          club={club}
          tieneQuincho={tieneQuincho}
          showNosotros={showNosotros}
          showProfesores={showProfesores} // Ahora se pasa el valor correcto desde la tabla 'clubes'
        />

        <main className="flex-grow">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
