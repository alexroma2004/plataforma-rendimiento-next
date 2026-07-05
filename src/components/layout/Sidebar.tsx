"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  DEFAULT_ROLE,
  getRoleLabel,
  isAppRole,
  type AppRole,
} from "@/lib/auth/permissions";

type NavItem = {
  label: string;
  href: string;
  allowedRoles?: AppRole[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type SidebarProps = {
  onClose?: () => void;
  onNavigate?: () => void;
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
        allowedRoles: ["admin", "staff"],
      },
      {
        label: "Cargar GPS",
        href: "/cargar-gps",
        allowedRoles: ["admin", "staff"],
      },
      {
        label: "Cargar neuromuscular",
        href: "/cargar-neuromuscular",
        allowedRoles: ["admin", "staff"],
      },
      {
        label: "Cargar tests",
        href: "/cargar-tests",
        allowedRoles: ["admin", "staff"],
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
        allowedRoles: ["admin"],
      },
      {
        label: "Jugadores",
        href: "/admin/jugadores",
        allowedRoles: ["admin"],
      },
      {
        label: "Usuarios",
        href: "/admin/usuarios",
        allowedRoles: ["admin"],
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

function canSeeItem(item: NavItem, role: AppRole) {
  if (!item.allowedRoles) return true;

  return item.allowedRoles.includes(role);
}

export default function Sidebar({ onClose, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<AppRole>(DEFAULT_ROLE);
  const [email, setEmail] = useState("");
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    async function loadRole() {
      try {
        setLoadingRole(true);

        const supabase = getSupabaseClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        setEmail(user?.email ?? "");

        if (!user) {
          setRole(DEFAULT_ROLE);
          return;
        }

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        const userRole = data?.role;

        setRole(isAppRole(userRole) ? userRole : DEFAULT_ROLE);
      } finally {
        setLoadingRole(false);
      }
    }

    loadRole();
  }, []);

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canSeeItem(item, role)),
      }))
      .filter((group) => group.items.length > 0);
  }, [role]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full min-h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-5 py-6">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
              Plataforma
            </p>

            <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950">
              Rendimiento
            </h1>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden"
            >
              Cerrar
            </button>
          )}
        </div>

        <p className="mt-1 text-sm font-bold text-slate-500">
          Next.js · Supabase · Vercel
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
            Usuario
          </p>

          <p className="mt-1 truncate text-xs font-bold text-slate-700">
            {email || "Sesión activa"}
          </p>

          <span className="mt-2 inline-flex rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
            {loadingRole ? "Cargando rol..." : getRoleLabel(role)}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-6">
        {visibleGroups.map((group) => (
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
                    onClick={onNavigate}
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
