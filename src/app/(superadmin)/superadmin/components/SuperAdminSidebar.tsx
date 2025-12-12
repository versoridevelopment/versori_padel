"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      <span className="h-2 w-2 rounded-full bg-white/70" />
      {label}
    </Link>
  );
}

export function SuperAdminSidebar() {
  return (
    <aside className="w-72 bg-gradient-to-b from-[#001a33] to-[#003366] text-white flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="text-lg font-extrabold tracking-tight">
          Versori Super Admin
        </div>
        <div className="text-xs text-white/70 mt-1">
          Gestión de tenants / clubes
        </div>
      </div>

      <nav className="px-4 py-6 flex-1 space-y-2">
        <NavItem href="/superadmin/clubes" label="Clubes" />
        {/* Podés agregar luego: usuarios, auditoría, etc. */}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <button
          type="button"
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 transition"
          onClick={() => alert("Luego conectamos cierre de sesión")}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
