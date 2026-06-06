"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

type NavItem = {
  label: string;
  href: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Inicio",
    items: [
      {
        label: "Dashboard",
        href: "/",
      },
    ],
  },
  {
    title: "Carga de datos",
    items: [
      {
        label: "Cargar datos",
        href: "/cargar",
      },
      {
        label: "Cargar GPS",
        href: "/cargar-gps",
      },
      {
        label: "Cargar neuromuscular",
        href: "/cargar-neuromuscular",
      },
      {
        label: "Cargar tests",
        href: "/cargar-tests",
      },
    ],
  },
  {
    title: "Análisis",
    items: [
      {
        label: "Equipo",
        href: "/equipo",
      },
      {
        label: "Jugador",
        href: "/jugador",
      },
      {
        label: "GPS",
        href: "/gps",
      },
      {
        label: "Rendimiento neuromuscular",
        href: "/neuromuscular",
      },
      {
        label: "Tests",
        href: "/tests",
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
        label: "Lupa IA",
        href: "/lupa-ia",
      },
      {
        label: "Informes",
        href: "/informes",
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        label: "Administración",
        href: "/admin",
      },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseClient();

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex min-h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-6">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
          Plataforma
        </p>

        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950">
          Rendimiento
        </h1>

        <p className="mt-1 text-sm font-bold text-slate-500">
          Next.js · Supabase · Vercel
        </p>
      </div>

      <nav className="flex-1 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "block rounded-xl px-4 py-3 text-sm font-bold transition",
                      active
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-black text-slate-700 transition hover:bg-red-50 hover:text-red-700"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}