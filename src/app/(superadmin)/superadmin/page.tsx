"use client";

import Link from "next/link";

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-1 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  // Placeholder (luego lo conectamos a métricas reales)
  const stats = [
    { title: "Clubes activos", value: 1 },
    { title: "Clubes inactivos", value: 0 },
    { title: "Último club creado", value: "Club Padel Central" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Dashboard Super Admin
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Gestión de tenants (clubes) y configuración global.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <StatCard key={s.title} title={s.title} value={s.value} />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-bold">Acciones rápidas</div>
            <div className="text-sm text-gray-600">
              Accedé rápidamente a las secciones principales.
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/superadmin/clubes"
              className="rounded-xl bg-[#003366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00284f]"
            >
              Ir a Clubes
            </Link>
            <Link
              href="/superadmin/clubes/nuevo"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Crear club
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
