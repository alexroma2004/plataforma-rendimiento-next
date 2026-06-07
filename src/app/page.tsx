"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import KpiCard from "@/components/ui/KpiCard";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  DEFAULT_ROLE,
  getRoleLabel,
  isAppRole,
  type AppRole,
} from "@/lib/auth/permissions";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
  badge: string;
  allowedRoles?: AppRole[];
};

const moduleCards: ModuleCard[] = [
  {
    title: "Cargar datos",
    description:
      "Importa sesiones GPS, neuromusculares y tests físicos desde archivos CSV.",
    href: "/cargar",
    badge: "Carga",
    allowedRoles: ["admin", "staff"],
  },
  {
    title: "GPS",
    description:
      "Analiza carga externa, rankings, objetivos de microciclo y carga semanal.",
    href: "/gps",
    badge: "Carga externa",
  },
  {
    title: "Rendimiento neuromuscular",
    description:
      "Consulta CMJ, RSI modificado, VMP, RPE, cambios PRE-POST y evolución individual.",
    href: "/neuromuscular",
    badge: "Fatiga",
  },
  {
    title: "Tests físicos",
    description:
      "Visualiza puntuaciones por capacidad, clasificaciones, rankings y variables físicas.",
    href: "/tests",
    badge: "Valoración",
  },
  {
    title: "Equipo",
    description:
      "Revisa el estado global de la plantilla, carga acumulada y tendencias generales.",
    href: "/equipo",
    badge: "Dashboard",
  },
  {
    title: "Jugador",
    description:
      "Analiza el perfil individual de cada futbolista integrando GPS, tests y neuromuscular.",
    href: "/jugador",
    badge: "Individual",
  },
  {
    title: "Perfil F-R",
    description:
      "Analiza la relación entre RSI modificado, VMP y perfil neuromuscular del jugador.",
    href: "/perfil-fr",
    badge: "Perfil",
  },
  {
    title: "Comparador",
    description:
      "Compara jugadores, variables, fechas y perfiles de rendimiento.",
    href: "/comparador",
    badge: "Análisis",
  },
  {
    title: "Informes",
    description:
      "Genera informes HTML y CSV para cuerpo técnico, jugadores y seguimiento semanal.",
    href: "/informes",
    badge: "Reportes",
  },
  {
    title: "Lupa IA",
    description:
      "Obtén lecturas automáticas, alertas y conclusiones rápidas sobre los datos cargados.",
    href: "/lupa-ia",
    badge: "IA",
  },
  {
    title: "Administración",
    description:
      "Controla equipos, jugadores, sesiones cargadas e integridad de los datos.",
    href: "/admin",
    badge: "Sistema",
    allowedRoles: ["admin"],
  },
];

function canSeeModule(module: ModuleCard, role: AppRole) {
  if (!module.allowedRoles) return true;

  return module.allowedRoles.includes(role);
}

export default function Home() {
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

  const visibleModuleCards = useMemo(() => {
    return moduleCards.filter((module) => canSeeModule(module, role));
  }, [role]);

  return (
    <AppShell
      title="Rendimiento · Tests · GPS"
      subtitle="Panel principal de la plataforma profesional para monitorizar estado neuromuscular, tests físicos y carga externa GPS en fútbol."
    >
      <div className="space-y-8">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Módulo neuromuscular"
            value="Activo"
            subtitle="CMJ, RSI modificado, VMP, RPE, PRE-POST y evolución."
            badge="Fatiga"
          />

          <KpiCard
            title="Módulo tests"
            value="Activo"
            subtitle="Valoración física, puntuaciones, capacidades y rankings."
            badge="Tests"
          />

          <KpiCard
            title="Módulo GPS"
            value="Activo"
            subtitle="Carga externa, objetivos semanales y referencia de partido."
            badge="GPS"
          />

          <KpiCard
            title="Usuario"
            value={loadingRole ? "Cargando" : getRoleLabel(role)}
            subtitle={
              email
                ? `Sesión iniciada como ${email}.`
                : isSupabaseConfigured
                  ? "Sesión activa en la plataforma."
                  : "Supabase pendiente de configurar."
            }
            badge="Rol"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
              Acceso rápido
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Módulos disponibles para tu rol
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              Esta pantalla muestra únicamente los módulos disponibles para el
              rol actual. Los usuarios de solo lectura no ven carga de datos ni
              administración; el staff puede cargar datos; el administrador ve
              toda la plataforma.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleModuleCards.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-950">
                      {module.title}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {module.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                    {module.badge}
                  </span>
                </div>

                <p className="mt-4 text-sm font-black text-blue-600 group-hover:text-blue-700">
                  Entrar →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
              Estado actual
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Aplicación en fase funcional y protegida
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              La plataforma ya cuenta con login obligatorio, roles de usuario,
              RLS activo en Supabase, carga de datos GPS, carga neuromuscular,
              carga de tests, dashboards de jugador y equipo, informes
              descargables, comparador, Lupa IA y administración.
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              La navegación y los accesos se adaptan al rol del usuario:
              administrador, staff o solo lectura.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
              Seguridad
            </p>

            <h2 className="mt-2 text-xl font-black">
              Roles activos
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Admin puede gestionar todo. Staff puede consultar y cargar datos.
              Viewer solo puede consultar información y generar análisis de
              lectura.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}