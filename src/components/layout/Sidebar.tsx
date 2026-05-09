"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    label: "Dashboard",
    href: "/",
  },
  {
    label: "Cargar datos",
    href: "/cargar",
  },
  {
    label: "Equipo",
    href: "/equipo",
  },
  {
    label: "Jugador",
    href: "/jugador",
  },
  {
    label: "Perfil F-R",
    href: "/perfil-fr",
  },
  {
    label: "Comparador",
    href: "/comparador",
  },
  {
    label: "Tests",
    href: "/tests",
  },
  {
    label: "GPS",
    href: "/gps",
  },
  {
    label: "Lupa IA",
    href: "/lupa-ia",
  },
  {
    label: "Informes",
    href: "/informes",
  },
  {
    label: "Administración",
    href: "/admin",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="min-h-screen w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-6">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">
          Plataforma
        </p>

        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950">
          Rendimiento
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Next.js · Supabase · Vercel
        </p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block rounded-xl px-4 py-3 text-sm font-semibold transition",
                active
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}