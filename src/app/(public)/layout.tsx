import "../globals.css";
import Navbar from "@/app/(public)/components/layout/Navbar";
import Footer from "@/app/(public)/components/layout/Footer";
import { getCurrentClub } from "@/lib/ObetenerClubUtils/getCurrentClub";
import { Montserrat } from "next/font/google";
import { Metadata } from "next";
import { supabase } from "@/lib/supabase/supabaseClient";

// --- AUTH SSR ---
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// --- METADATA DINÁMICA MULTI-TENANT ---
export async function generateMetadata(): Promise<Metadata> {
  const club = await getCurrentClub();

  const h = await headers();
  const host =
    h.get("x-forwarded-host") ||
    h.get("host") ||
    "versorisports.com";

  const proto = h.get("x-forwarded-proto") || "https";

  const baseUrl = `${proto}://${host}`;

  const timestamp = Date.now();
  const iconUrl = club?.logo_url
    ? `${club.logo_url}?v=${timestamp}`
    : "/icon.png";

  const nombreClub =
    club?.nombre?.trim() || host.split(".")[0] || "Reservas";

  const title = `${nombreClub} | Reservas de canchas online`;

  const description = `Reservá tu cancha en ${nombreClub} de forma online. Turnos disponibles en tiempo real.`;

  return {
    metadataBase: new URL(baseUrl),

    title,
    description,

    robots: {
      index: true,
      follow: true,
    },

    alternates: {
      canonical: "/",
    },

    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },

    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: nombreClub,
      locale: "es_AR",
      type: "website",
      images: [
        {
          url: iconUrl,
          width: 512,
          height: 512,
          alt: `${nombreClub} logo`,
        },
      ],
    },

    twitter: {
      card: "summary",
      title,
      description,
      images: [iconUrl],
    },
  };
}

// --- ROOT LAYOUT ---
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. SESIÓN SSR
  const cookieStore = await cookies();

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Layout no puede setear cookies (solo lectura)
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  // 2. DATOS DEL CLUB
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
        className={`relative min-h-screen flex flex-col overflow-x-hidden antialiased text-white bg-black ${montserrat.className}`}
      >
        {/* Fondo Gradiente Global */}
        <div className="fixed inset-0 -z-50 bg-gradient-to-b from-[#06090e] via-[#0b1018] to-[#121a22]" />

        <Navbar
          club={club}
          tieneQuincho={tieneQuincho}
          showNosotros={showNosotros}
          showProfesores={showProfesores}
          initialUser={user}
        />

        <main className="flex-grow w-full relative">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
