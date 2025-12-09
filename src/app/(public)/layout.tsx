// src/app/layout.tsx (o app/(public)/layout.tsx si usás grupos)
import "../globals.css";
import Navbar from "@/app/(public)/components/layout/Navbar";
import Footer from "@/app/(public)/components/layout/Footer";
import { getCurrentClub } from "@/lib/getCurrentClub";
import RecoveryGuard from "@/app/(public)/components//RecoveryGuard";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const club = await getCurrentClub();

  console.log("CLUB ENCONTRADO DESDE RootLayout:", club);

  return (
    <html lang="es">
      <body className="relative min-h-screen text-white bg-black">
        {/* 👇 2. Lo colocamos aquí para que vigile la navegación en todo el sitio */}
        <RecoveryGuard />

        <div className="fixed inset-0 -z-50 bg-gradient-to-b from-[#06090e] via-[#0b1018] to-[#121a22]" />
        <Navbar club={club} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}