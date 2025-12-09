import "../globals.css"; // 👈 IMPORTANTE: Asegurate que la ruta apunte a tu globals.css

export const metadata = {
  title: "Seguridad - Club Padel Central",
  description: "Restablecer contraseña",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="w-full min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}