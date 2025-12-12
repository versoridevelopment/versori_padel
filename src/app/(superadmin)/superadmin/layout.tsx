import "../../globals.css";
import { SuperAdminSidebar } from "./components/SuperAdminSidebar";

export const metadata = {
  title: "Panel Super Admin | Versori",
};

// Layout del panel SUPER ADMIN
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50">
        <div className="flex h-screen text-gray-900">
          <SuperAdminSidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
